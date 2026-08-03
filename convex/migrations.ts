import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

// Migración puntual de un solo uso (MCP-76): cambia el email de un usuario
// ya existente, dejando password/rol/_id intactos. Se borra este archivo
// una vez migrados los deployments dev y prod.
export const updateUserEmail = mutation({
  args: { oldEmail: v.string(), newEmail: v.string() },
  returns: v.null(),
  handler: async (ctx, { oldEmail, newEmail }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", oldEmail))
      .unique();
    if (!user) throw new Error(`No existe ningún usuario con email ${oldEmail}`);

    const clash = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", newEmail))
      .unique();
    if (clash) throw new Error(`Ya existe un usuario con email ${newEmail}`);

    await ctx.db.patch(user._id, { email: newEmail });
    return null;
  },
});

// Migración puntual de un solo uso: rellena `contacts.ultimoContactoISO`
// para los contactos que ya tenían interacciones registradas antes de que
// ese campo existiera (a partir de ahora `interacciones.create` lo mantiene
// al día solo). Idempotente: recalcula el valor desde cero en cada
// ejecución en vez de acumular, así que se puede reintentar sin riesgo si
// se corta a medias. Se borra este archivo una vez migrados dev y prod.
// `internalMutation` (no `mutation`): solo se invoca desde el CLI/dashboard
// de Convex, nunca debe ser llamable desde el cliente.
export const backfillUltimoContacto = internalMutation({
  args: {},
  returns: v.object({ contactosActualizados: v.number() }),
  handler: async (ctx) => {
    const contacts = await ctx.db.query("contacts").collect();
    let contactosActualizados = 0;

    for (const contact of contacts) {
      const interacciones = await ctx.db
        .query("interacciones")
        .withIndex("by_cliente", (q) => q.eq("clienteId", contact._id))
        .collect();
      if (interacciones.length === 0) continue;

      const ultimo = interacciones.reduce(
        (latest, i) => (i.fecha > latest ? i.fecha : latest),
        interacciones[0].fecha
      );
      if (ultimo !== contact.ultimoContactoISO) {
        await ctx.db.patch(contact._id, { ultimoContactoISO: ultimo });
        contactosActualizados++;
      }
    }

    return { contactosActualizados };
  },
});
