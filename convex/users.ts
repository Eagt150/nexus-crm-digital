import { query } from "./_generated/server";
import { MOCK_SESSION_EMAIL } from "./mockSession";

// Sin argumentos a propósito: expone únicamente el usuario de la sesión
// mock fija (ver convex/mockSession.ts), nunca un email arbitrario que
// mande el cliente — así no sirve para enumerar usuarios/roles por email.
// No lanza si falta el seed (a diferencia de getMockCurrentUser): el
// frontend la usa para decidir qué mostrar mientras carga, así que un
// `null` (no sembrado todavía) es más útil que un error no capturado.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", MOCK_SESSION_EMAIL))
      .unique();
  },
});
