import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./mockSession";
import { loadAuthorizedContact, isContactVisible } from "./contacts";
import { isValidISODate } from "./validation";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoToUtcMs(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getTime();
}

function utcMsToIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// El cliente propone "hoy" en su huso horario local, pero nunca puede usarlo
// para pedir un rango de datos arbitrario: si se aleja más de 1 día del "hoy"
// real del servidor (UTC), se ignora y se usa el del servidor.
function resolveCutoff(localTodayISO: string): string {
  const serverTodayISO = utcMsToIso(Date.now());
  const diffDays = Math.round(
    (isoToUtcMs(localTodayISO) - isoToUtcMs(serverTodayISO)) / MS_PER_DAY
  );
  if (!Number.isFinite(diffDays) || Math.abs(diffDays) > 1) return serverTodayISO;
  return localTodayISO;
}

export const listPending = query({
  args: { localTodayISO: v.string() },
  returns: v.array(
    v.object({
      id: v.id("seguimientos"),
      accion: v.string(),
      vence: v.string(),
      urgency: v.union(v.literal("atrasado"), v.literal("hoy")),
      cliente: v.object({
        id: v.id("contacts"),
        nombre: v.string(),
        estado: v.optional(v.string()),
      }),
      responsable: v.object({ id: v.id("users"), nombre: v.string() }),
    })
  ),
  handler: async (ctx, { localTodayISO }) => {
    const cutoff = resolveCutoff(localTodayISO);
    const currentUser = await requireCurrentUser(ctx);

    const rows = await ctx.db
      .query("seguimientos")
      .withIndex("by_hecho_vence", (q) => q.eq("hecho", false).lte("vence", cutoff))
      .collect();

    const visible =
      currentUser.rol === "propietaria"
        ? rows
        : rows.filter((row) => row.responsable === currentUser._id);

    const resolved = await Promise.all(
      visible.map(async (row) => {
        const [cliente, responsable] = await Promise.all([
          ctx.db.get(row.clienteId),
          ctx.db.get(row.responsable),
        ]);
        if (!cliente || !responsable) return null;
        return {
          id: row._id,
          accion: row.accion,
          vence: row.vence,
          urgency: (row.vence < cutoff ? "atrasado" : "hoy") as "atrasado" | "hoy",
          cliente: { id: cliente._id, nombre: cliente.nombre, estado: cliente.estado },
          responsable: { id: responsable._id, nombre: responsable.nombre },
        };
      })
    );

    return resolved.filter((row): row is NonNullable<typeof row> => row !== null);
  },
});

// Seguimientos de un cliente concreto: alimenta tanto "pendientes"
// (hecho=false) como "seguimientos completados" del historial (hecho=true)
// en la ficha — una sola query sirve ambas secciones, el frontend filtra por
// `hecho`. Query de lectura: nunca lanza por autorización, devuelve `[]` si
// el cliente no existe o no es visible (mismo contrato que
// `contacts.getById`/`interacciones.listByCliente`).
export const listByCliente = query({
  args: { clienteId: v.id("contacts") },
  returns: v.array(
    v.object({
      id: v.id("seguimientos"),
      accion: v.string(),
      vence: v.string(),
      hecho: v.boolean(),
      fechaHecho: v.optional(v.string()),
      responsable: v.object({ id: v.id("users"), nombre: v.string() }),
      canMarkDone: v.boolean(),
    })
  ),
  handler: async (ctx, { clienteId }) => {
    const contact = await ctx.db.get(clienteId);
    if (!contact) return [];

    const currentUser = await requireCurrentUser(ctx);
    if (!(await isContactVisible(ctx, contact, currentUser))) return [];

    const rows = await ctx.db
      .query("seguimientos")
      .withIndex("by_cliente", (q) => q.eq("clienteId", clienteId))
      .collect();

    const resolved = await Promise.all(
      rows.map(async (row) => {
        const responsable = await ctx.db.get(row.responsable);
        if (!responsable) return null;
        return {
          id: row._id,
          accion: row.accion,
          vence: row.vence,
          hecho: row.hecho,
          fechaHecho: row.fechaHecho,
          responsable: { id: responsable._id, nombre: responsable.nombre },
          // Mismo contrato de autorización que `markDone`/`loadAuthorized` más
          // abajo: la ficha muestra los seguimientos de TODOS los responsables
          // (para que Carlos vea el cuadro completo), pero solo puede marcarlos
          // como hechos la propietaria o el responsable asignado. Sin este
          // campo, la UI no tiene forma de saber que el checkbox de un
          // seguimiento ajeno va a ser rechazado por el servidor.
          canMarkDone: currentUser.rol === "propietaria" || row.responsable === currentUser._id,
        };
      })
    );

    return resolved.filter((row): row is NonNullable<typeof row> => row !== null);
  },
});

export const create = mutation({
  args: {
    clienteId: v.id("contacts"),
    accion: v.string(),
    vence: v.string(),
    responsableId: v.id("users"),
  },
  returns: v.id("seguimientos"),
  handler: async (ctx, { clienteId, accion, vence, responsableId }) => {
    await loadAuthorizedContact(ctx, clienteId);

    const accion_ = accion.trim();
    if (!accion_) throw new Error("La acción es obligatoria.");
    if (!isValidISODate(vence)) throw new Error("Fecha no válida.");

    // `responsable` puede venir del cliente (P-08 permite reasignar a
    // cualquier miembro del equipo) — a diferencia de `autor`, que nunca
    // acepta el cliente. Por eso se valida explícitamente que exista.
    const responsable = await ctx.db.get(responsableId);
    if (!responsable) throw new Error("Responsable no válido.");

    return await ctx.db.insert("seguimientos", {
      clienteId,
      accion: accion_,
      vence,
      hecho: false,
      responsable: responsableId,
    });
  },
});

// Autoriza y carga un seguimiento para mutarlo. No distingue "no existe" de
// "existe pero no es tuyo" en el mensaje de error, para no filtrar por el
// mensaje si un id es válido o no.
async function loadAuthorized(ctx: QueryCtx | MutationCtx, id: Id<"seguimientos">) {
  const currentUser = await requireCurrentUser(ctx);
  const seguimiento = await ctx.db.get(id);
  const authorized =
    seguimiento !== null &&
    (currentUser.rol === "propietaria" || seguimiento.responsable === currentUser._id);
  if (!authorized) throw new Error("No autorizado");
  return seguimiento;
}

export const markDone = mutation({
  args: { id: v.id("seguimientos") },
  handler: async (ctx, { id }) => {
    await loadAuthorized(ctx, id);
    await ctx.db.patch(id, { hecho: true, fechaHecho: utcMsToIso(Date.now()) });
  },
});

export const undoDone = mutation({
  args: { id: v.id("seguimientos") },
  handler: async (ctx, { id }) => {
    await loadAuthorized(ctx, id);
    // Solo se revierte `hecho`; no se toca `fechaHecho` porque no se lee en
    // ningún lugar de la UI de Hoy y no vale la pena depender del
    // comportamiento de "unset" de patch() para un campo opcional.
    await ctx.db.patch(id, { hecho: false });
  },
});
