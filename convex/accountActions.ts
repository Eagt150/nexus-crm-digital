"use node";

import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeEmail } from "./mockSession";

const MIN_PASSWORD_LENGTH = 8;

type ChangePasswordResult = "ok" | "invalid-current" | "google-only" | "weak-password";
const CHANGE_PASSWORD_RESULT = v.union(
  v.literal("ok"),
  v.literal("invalid-current"),
  v.literal("google-only"),
  v.literal("weak-password")
);

// "Cambiar contraseña" en /cuenta (MCP-73) — a diferencia del flujo de
// olvido/reset (convex/passwordReset.ts, convex/passwordResetActions.ts),
// este exige conocer la contraseña actual en vez de un token/código por
// email, así que necesita al usuario ya autenticado: resuelve la identidad
// vía ctx.auth (igual contrato que ctx.auth.getUserIdentity() en
// queries/mutations, ver convex/mockSession.ts — las actions no tienen
// ctx.db, así que la lectura real pasa por getUserForLogin). Vive en su
// propio archivo "use node" porque bcrypt necesita el runtime Node de
// Convex, que no puede convivir con mutation/query (users.ts sí las mezcla).
export const changeMyPassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  returns: CHANGE_PASSWORD_RESULT,
  handler: async (ctx, { currentPassword, newPassword }): Promise<ChangePasswordResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) throw new Error("No autenticado");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return "weak-password";
    }

    const user = await ctx.runQuery(internal.users.getUserForLogin, {
      email: normalizeEmail(identity.email),
    });
    // Ambos casos ya deberían estar cubiertos por el JWT verificado (no
    // debería haber identidad sin fila, y una fila desactivada ya pierde su
    // token, ver convex/mockSession.ts) — se tratan igual que "no
    // autenticado" en vez de un mensaje distinto, no hay nada más que decir.
    if (!user || user.activo === false) throw new Error("No autenticado");

    if (!user.passwordHash) return "google-only";

    // Mismo lockout que el login normal (convex/authActions.ts) — sin esto,
    // una sesión ya autenticada podría usar este endpoint para adivinar la
    // contraseña actual sin el límite de intentos que sí protege /login.
    if (user.lockedUntil !== undefined && user.lockedUntil > Date.now()) {
      return "invalid-current";
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      await ctx.runMutation(internal.users.recordLoginOutcome, { userId: user.id, success: false });
      return "invalid-current";
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await ctx.runMutation(internal.users.setPasswordHashInternal, {
      userId: user.id,
      passwordHash,
    });
    return "ok";
  },
});
