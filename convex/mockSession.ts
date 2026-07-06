import type { DatabaseReader } from "./_generated/server";

// ============================================================
// DEMO ONLY — NO ES AUTENTICACIÓN REAL.
// Toda función que llame a getMockCurrentUser() confía en este
// email fijo como "quien hace la petición", sin verificar nada
// del cliente real. Esto NO es control de acceso productivo:
// cualquiera con la URL de Convex actúa como este usuario.
// INTEGRATION POINT (MCP-28): eliminar este archivo y reemplazar
// getMockCurrentUser() por ctx.auth.getUserIdentity() (o equivalente)
// en cuanto exista autenticación real.
// Mantener MOCK_SESSION_EMAIL sincronizado con src/lib/session.ts.
// ============================================================
export const MOCK_SESSION_EMAIL = "marta@vibecrm.dev";

export async function getMockCurrentUser(ctx: { db: DatabaseReader }) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", MOCK_SESSION_EMAIL))
    .unique();
  if (!user) throw new Error("Seed incompleto: falta el usuario de sesión mock");
  return user;
}
