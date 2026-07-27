import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
