import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCurrentUser } from "./mockSession";
import { loadAuthorizedContact, isContactVisible } from "./contacts";
import { isValidISODate } from "./validation";

const ESTADO_VENTA = v.union(
  v.literal("oportunidad"),
  v.literal("ganada"),
  v.literal("perdida")
);

// `propietaria` ve todas las ventas; `comercial` solo las que registró
// ella misma (mismo contrato de autorización que contacts.ts/seguimientos.ts).
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("ventas"),
      concepto: v.string(),
      importe: v.number(),
      estado: v.union(v.literal("oportunidad"), v.literal("ganada"), v.literal("perdida")),
      fecha: v.string(),
      cliente: v.object({ id: v.id("contacts"), nombre: v.string() }),
      autor: v.object({ id: v.id("users"), nombre: v.string() }),
    })
  ),
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    const rows = await ctx.db.query("ventas").collect();
    const visible =
      currentUser.rol === "propietaria" ? rows : rows.filter((r) => r.autor === currentUser._id);

    const resolved = await Promise.all(
      visible.map(async (row) => {
        const [cliente, autor] = await Promise.all([
          ctx.db.get(row.clienteId),
          ctx.db.get(row.autor),
        ]);
        if (!cliente || !autor) return null;
        return {
          id: row._id,
          concepto: row.concepto,
          importe: row.importe,
          estado: row.estado,
          fecha: row.fecha,
          cliente: { id: cliente._id, nombre: cliente.nombre },
          autor: { id: autor._id, nombre: autor.nombre },
        };
      })
    );

    return resolved
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  },
});

// Ventas de un cliente concreto, para el historial de la ficha. Sin campo
// `cliente` (redundante: ya está scoped a un único clienteId), a diferencia
// de `list`. Query de lectura: nunca lanza por autorización, devuelve `[]`
// si el cliente no existe o no es visible (mismo contrato que
// `contacts.getById`/`interacciones.listByCliente`).
export const listByCliente = query({
  args: { clienteId: v.id("contacts") },
  returns: v.array(
    v.object({
      id: v.id("ventas"),
      concepto: v.string(),
      importe: v.number(),
      estado: ESTADO_VENTA,
      fecha: v.string(),
      autor: v.object({ id: v.id("users"), nombre: v.string() }),
    })
  ),
  handler: async (ctx, { clienteId }) => {
    const contact = await ctx.db.get(clienteId);
    if (!contact) return [];

    const currentUser = await requireCurrentUser(ctx);
    if (!(await isContactVisible(ctx, contact, currentUser))) return [];

    const rows = await ctx.db
      .query("ventas")
      .withIndex("by_cliente", (q) => q.eq("clienteId", clienteId))
      .collect();

    const resolved = await Promise.all(
      rows.map(async (row) => {
        const autor = await ctx.db.get(row.autor);
        if (!autor) return null;
        return {
          id: row._id,
          concepto: row.concepto,
          importe: row.importe,
          estado: row.estado,
          fecha: row.fecha,
          autor: { id: autor._id, nombre: autor.nombre },
        };
      })
    );

    return resolved.filter((row): row is NonNullable<typeof row> => row !== null);
  },
});

export const create = mutation({
  args: {
    clienteId: v.id("contacts"),
    concepto: v.string(),
    importe: v.number(),
    estado: v.optional(ESTADO_VENTA),
    fecha: v.string(),
  },
  returns: v.id("ventas"),
  handler: async (ctx, { clienteId, concepto, importe, estado, fecha }) => {
    await loadAuthorizedContact(ctx, clienteId);

    const concepto_ = concepto.trim();
    if (!concepto_) throw new Error("El concepto es obligatorio.");
    if (!(importe > 0)) throw new Error("El importe debe ser mayor que 0.");
    if (!isValidISODate(fecha)) throw new Error("Fecha no válida.");

    const currentUser = await requireCurrentUser(ctx);
    return await ctx.db.insert("ventas", {
      clienteId,
      concepto: concepto_,
      importe,
      estado: estado ?? "oportunidad",
      fecha,
      autor: currentUser._id,
    });
  },
});
