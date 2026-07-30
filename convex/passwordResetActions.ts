"use node";

import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const MIN_PASSWORD_LENGTH = 8;

type ConfirmOutcome = "ok" | "invalid" | "expired";
const CONFIRM_OUTCOME = v.union(v.literal("ok"), v.literal("invalid"), v.literal("expired"));

// Viven en su propio archivo "use node" porque bcrypt necesita el runtime
// Node de Convex, y un archivo con "use node" no puede además exportar
// mutation (passwordReset.ts sí las mezcla con query/action, así que no
// puede vivir ahí). El hash se calcula aquí; la validación final (token o
// código, expiración, intentos, gate Google-only) y la escritura viven en
// convex/passwordReset.ts (finalizeByToken/finalizeByCode) como última
// palabra atómica — ver esos comentarios para el porqué.

export const confirmReset = action({
  args: { token: v.string(), newPassword: v.string() },
  returns: CONFIRM_OUTCOME,
  handler: async (ctx, { token, newPassword }): Promise<ConfirmOutcome> => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return await ctx.runMutation(internal.passwordReset.finalizeByToken, { token, passwordHash });
  },
});

export const confirmResetWithCode = action({
  args: { email: v.string(), code: v.string(), newPassword: v.string() },
  returns: CONFIRM_OUTCOME,
  handler: async (ctx, { email, code, newPassword }): Promise<ConfirmOutcome> => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return await ctx.runMutation(internal.passwordReset.finalizeByCode, {
      email,
      code,
      passwordHash,
    });
  },
});
