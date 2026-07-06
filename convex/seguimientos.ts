import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { getMockCurrentUser } from "./mockSession";

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
    const currentUser = await getMockCurrentUser(ctx);

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

// Autoriza y carga un seguimiento para mutarlo. No distingue "no existe" de
// "existe pero no es tuyo" en el mensaje de error, para no filtrar por el
// mensaje si un id es válido o no.
async function loadAuthorized(ctx: QueryCtx | MutationCtx, id: Id<"seguimientos">) {
  const currentUser = await getMockCurrentUser(ctx);
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
