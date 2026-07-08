import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMockCurrentUser, MOCK_SESSION_EMAIL } from "./mockSession";

const SAFE_USER_FIELDS = v.object({
  id: v.id("users"),
  nombre: v.string(),
  email: v.string(),
  rol: v.union(v.literal("propietaria"), v.literal("comercial")),
});

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

// DEMO ONLY — compara la contraseña en texto plano (ver el campo `password`
// en el schema). No emite ningún token de sesión: el frontend guarda el
// usuario devuelto en localStorage y confía en él sin más verificación.
// INTEGRATION POINT (MCP-28): sustituir por el `signIn` real del proveedor
// de auth (hash de contraseña, tokens, cookies de sesión, etc.).
export const login = mutation({
  args: { email: v.string(), password: v.string() },
  returns: v.union(SAFE_USER_FIELDS, v.null()),
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user || !user.password || user.password !== password) return null;
    return { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol };
  },
});

// Lista de usuarios para la pantalla de Equipo. Restringida a `propietaria`
// en el servidor (no solo en la UI) siguiendo el mismo contrato de
// autorización que el resto de queries de este archivo.
export const listAll = query({
  args: {},
  returns: v.array(SAFE_USER_FIELDS),
  handler: async (ctx) => {
    const currentUser = await getMockCurrentUser(ctx);
    if (currentUser.rol !== "propietaria") return [];

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ id: u._id, nombre: u.nombre, email: u.email, rol: u.rol }));
  },
});
