import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUserOrNull, normalizeEmail, requireCurrentUser } from "./mockSession";

const SAFE_USER_FIELDS = v.object({
  id: v.id("users"),
  nombre: v.string(),
  email: v.string(),
  rol: v.union(v.literal("propietaria"), v.literal("comercial")),
});

// Sin argumentos a propósito: expone únicamente el usuario autenticado real
// (identidad verificada por Convex vía ctx.auth, ver convex/mockSession.ts
// y convex/auth.config.ts), nunca un email arbitrario que mande el cliente —
// así no sirve para enumerar usuarios/roles por email. No lanza si no hay
// sesión o el usuario no está aprovisionado: el frontend la usa para decidir
// qué mostrar mientras carga, así que un `null` es más útil que un error no
// capturado.
export const getCurrentUser = query({
  args: {},
  returns: v.union(SAFE_USER_FIELDS, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol };
  },
});

// Existencia-únicamente, invocable solo desde otras funciones de Convex
// (nunca desde el cliente): respalda `checkProvisioned` más abajo, que es la
// única forma de consultar esto desde fuera, y solo con el secreto
// compartido correcto — así se evita exponer una query pública que permita
// enumerar qué emails están aprovisionados.
export const isProvisionedInternal = internalQuery({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique();
    return user !== null;
  },
});

// Gate de aprovisionamiento para el login con Google: Auth.js (server-side,
// callback `signIn`) llama a esta action pasando el secreto compartido
// PROVISION_CHECK_SECRET (nunca expuesto al cliente). Si el secreto no
// coincide, devuelve `false` sin distinguir ese caso de "no aprovisionado"
// en la respuesta — no hay forma de usar esto para enumerar emails sin
// conocer ya el secreto del servidor.
export const checkProvisioned = action({
  args: { email: v.string(), secret: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { email, secret }): Promise<boolean> => {
    if (secret !== process.env.PROVISION_CHECK_SECRET) return false;
    return await ctx.runQuery(internal.users.isProvisionedInternal, { email });
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

// Lista mínima de compañeros de equipo (id + nombre), para el selector
// "Responsable" de "Programar seguimiento" (MCP-74). A diferencia de
// `listAll`, no está restringida a `propietaria`: cualquier usuario en
// sesión necesita ver a quién puede asignarle un seguimiento. No expone
// email/rol para no filtrar más de lo necesario.
export const listTeamMembers = query({
  args: {},
  returns: v.array(v.object({ id: v.id("users"), nombre: v.string() })),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ id: u._id, nombre: u.nombre }));
  },
});

// Lista de usuarios para la pantalla de Equipo. Restringida a `propietaria`
// en el servidor (no solo en la UI) siguiendo el mismo contrato de
// autorización que el resto de queries de este archivo.
export const listAll = query({
  args: {},
  returns: v.array(SAFE_USER_FIELDS),
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    if (currentUser.rol !== "propietaria") return [];

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ id: u._id, nombre: u.nombre, email: u.email, rol: u.rol }));
  },
});
