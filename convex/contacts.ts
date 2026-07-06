import { v } from "convex/values";
import { query } from "./_generated/server";
import { getMockCurrentUser } from "./mockSession";

// Devuelve solo los campos que la ficha placeholder necesita mostrar (no
// telefono/email/nota) y aplica el mismo contrato de autorización que
// seguimientos.ts: `propietaria` puede ver cualquier contacto; `comercial`
// solo los contactos con los que tiene al menos un seguimiento propio. No
// distingue "no existe" de "no autorizado" (ambos devuelven null) para no
// filtrar por la respuesta si un id es válido o no.
export const getById = query({
  args: { id: v.id("contacts") },
  returns: v.union(
    v.object({
      id: v.id("contacts"),
      nombre: v.string(),
      estado: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, { id }) => {
    const contact = await ctx.db.get(id);
    if (!contact) return null;

    const currentUser = await getMockCurrentUser(ctx);
    if (currentUser.rol !== "propietaria") {
      const ownFollowUp = await ctx.db
        .query("seguimientos")
        .withIndex("by_cliente", (q) => q.eq("clienteId", id))
        .filter((q) => q.eq(q.field("responsable"), currentUser._id))
        .first();
      if (!ownFollowUp) return null;
    }

    return { id: contact._id, nombre: contact.nombre, estado: contact.estado };
  },
});
