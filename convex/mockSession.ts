import type { MutationCtx, QueryCtx } from "./_generated/server";

// Email de la propietaria usado solo por convex/seedDemo.ts para
// encontrar/crear su fila al sembrar datos de prueba. No participa en la
// resolución de identidad real (ver getCurrentUserOrNull más abajo) — esa
// viene siempre del JWT verificado por Convex, nunca de esta constante.
export const DEMO_OWNER_EMAIL = "edisoncodex@gmail.com";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Resuelve el usuario autenticado real a partir de la identidad que Convex
// ya verificó criptográficamente (ver convex/auth.config.ts) contra el JWT
// que firma Next.js/Auth.js. Devuelve null si no hay sesión o si el email
// autenticado no corresponde a ningún usuario aprovisionado — nunca lanza,
// para que el caller decida qué hacer con "no hay sesión todavía" (p. ej.
// getCurrentUser en users.ts, que el frontend usa mientras carga).
export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalizeEmail(identity.email!)))
    .unique();
}

// Igual que getCurrentUserOrNull pero lanza si no hay usuario autenticado y
// aprovisionado — para el resto de mutations/queries de negocio, que
// asumen siempre hay alguien logueado (mismo contrato que tenía
// getMockCurrentUser antes de esta migración a identidad real).
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) throw new Error("No autenticado o usuario no aprovisionado");
  return user;
}
