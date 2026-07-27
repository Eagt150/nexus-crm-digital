import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCurrentUser } from "./mockSession";
import { loadAuthorizedContact, isContactVisible } from "./contacts";
import { isValidISODate } from "./validation";

const TIPO_INTERACCION = v.union(
  v.literal("llamada"),
  v.literal("email"),
  v.literal("whatsapp"),
  v.literal("en_persona")
);

// Query de lectura: nunca lanza por autorización (a diferencia de `create`),
// devuelve `[]` si el cliente no existe o no es visible para el usuario en
// sesión — mismo contrato que `contacts.getById`. Esto permite que la ficha
// dispare esta query en paralelo con `contacts.getById` sin romper el render
// si el cliente no es autorizado.
export const listByCliente = query({
  args: { clienteId: v.id("contacts") },
  returns: v.array(
    v.object({
      id: v.id("interacciones"),
      tipo: TIPO_INTERACCION,
      texto: v.string(),
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
      .query("interacciones")
      .withIndex("by_cliente", (q) => q.eq("clienteId", clienteId))
      .collect();

    const resolved = await Promise.all(
      rows.map(async (row) => {
        const autor = await ctx.db.get(row.autor);
        if (!autor) return null;
        return {
          id: row._id,
          tipo: row.tipo,
          texto: row.texto,
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
    tipo: TIPO_INTERACCION,
    texto: v.string(),
    fecha: v.string(),
  },
  returns: v.id("interacciones"),
  handler: async (ctx, { clienteId, tipo, texto, fecha }) => {
    await loadAuthorizedContact(ctx, clienteId);

    const texto_ = texto.trim();
    if (!texto_) throw new Error("La nota es obligatoria.");
    if (!isValidISODate(fecha)) throw new Error("Fecha no válida.");

    const currentUser = await requireCurrentUser(ctx);
    return await ctx.db.insert("interacciones", {
      clienteId,
      tipo,
      texto: texto_,
      fecha,
      autor: currentUser._id,
    });
  },
});
