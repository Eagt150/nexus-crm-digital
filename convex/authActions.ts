"use node";

import bcrypt from "bcryptjs";
import { v, type Infer } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeEmail } from "./mockSession";

const SAFE_USER_FIELDS = v.object({
  id: v.id("users"),
  nombre: v.string(),
  email: v.string(),
  rol: v.union(v.literal("propietaria"), v.literal("comercial")),
});
type SafeUser = Infer<typeof SAFE_USER_FIELDS>;

// Reemplaza la vieja mutation en texto plano de convex/users.ts (MCP-78).
// Vive en su propio archivo "use node" porque bcrypt necesita el runtime
// Node de Convex, y un archivo con "use node" no puede además exportar
// query/mutation (users.ts sí las mezcla, así que no puede vivir ahí).
// No se distingue "email no existe" de "cuenta bloqueada" de "contraseña
// incorrecta" en la respuesta — mismo mensaje genérico en los tres casos,
// para no abrir un canal de enumeración ni de "esta cuenta está bloqueada".
export const login = action({
  args: { email: v.string(), password: v.string() },
  returns: v.union(SAFE_USER_FIELDS, v.null()),
  handler: async (ctx, { email, password }): Promise<SafeUser | null> => {
    const user = await ctx.runQuery(internal.users.getUserForLogin, {
      email: normalizeEmail(email),
    });
    if (!user) return null;

    // Usuario eliminado desde /equipo (MCP-72) — mismo rechazo genérico que
    // el resto de esta función, sin distinguir el motivo.
    if (user.activo === false) return null;

    if (user.lockedUntil !== undefined && user.lockedUntil > Date.now()) {
      return null;
    }

    if (!user.passwordHash) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    await ctx.runMutation(internal.users.recordLoginOutcome, {
      userId: user.id,
      success: valid,
    });
    if (!valid) return null;

    return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
  },
});
