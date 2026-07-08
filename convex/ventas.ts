import { v } from "convex/values";
import { query } from "./_generated/server";
import { getMockCurrentUser } from "./mockSession";

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
    const currentUser = await getMockCurrentUser(ctx);
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
