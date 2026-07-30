import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUserOrNull, normalizeEmail, requireCurrentUser } from "./mockSession";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 min

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

export const getPasswordChangedAtInternal = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique();
    return user?.passwordChangedAt ?? null;
  },
});

// Igual patrón que `checkProvisioned`: gateada por el secreto compartido
// para que no sirva como query pública arbitraria por email. `auth.ts` la
// llama al mintear el token de Convex, para embeber `passwordChangedAt`
// como claim (`pwAt`) y poder invalidar tokens emitidos antes de un reset
// — ver convex/mockSession.ts.
export const getPasswordChangedAt = action({
  args: { email: v.string(), secret: v.string() },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, { email, secret }): Promise<number | null> => {
    if (secret !== process.env.PROVISION_CHECK_SECRET) return null;
    return await ctx.runQuery(internal.users.getPasswordChangedAtInternal, { email });
  },
});

// Login por contraseña real (bcrypt) — MCP-78. La comparación en sí vive en
// convex/authActions.ts (necesita el runtime Node de Convex para bcrypt, que
// no puede convivir con query/mutation en el mismo archivo). Esta query solo
// lee lo necesario; no expone `passwordHash` fuera de este módulo — el
// caller (authActions.ts, mismo backend) sí necesita verlo para comparar.
export const getUserForLogin = internalQuery({
  args: { email: v.string() },
  returns: v.union(
    v.object({
      id: v.id("users"),
      nombre: v.string(),
      email: v.string(),
      rol: v.union(v.literal("propietaria"), v.literal("comercial")),
      passwordHash: v.optional(v.string()),
      lockedUntil: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) return null;
    return {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      passwordHash: user.passwordHash,
      lockedUntil: user.lockedUntil,
    };
  },
});

// Única fuente de verdad para el contador de intentos fallidos: relee
// `failedLoginAttempts` en vivo dentro de sí misma (no confía en un valor
// que la action haya calculado antes del bcrypt.compare, que tarda) — así
// dos intentos concurrentes no pueden pisarse el incremento uno al otro.
export const recordLoginOutcome = internalMutation({
  args: { userId: v.id("users"), success: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, success }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;

    if (success) {
      await ctx.db.patch(userId, { failedLoginAttempts: 0, lockedUntil: undefined });
      return null;
    }

    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await ctx.db.patch(userId, {
        failedLoginAttempts: attempts,
        lockedUntil: Date.now() + LOGIN_LOCKOUT_MS,
      });
    } else {
      await ctx.db.patch(userId, { failedLoginAttempts: attempts });
    }
    return null;
  },
});

// Soporte de convex/hashPasswordsMigration.ts (MCP-78) — la action Node no
// tiene `ctx.db`, así que orquesta llamando a esta query (para leer) y a
// `applyPasswordHash` (para escribir). Solo devuelve lo estrictamente
// necesario para hashear (id + password en texto plano).
export const listUsersWithPlaintextPassword = internalQuery({
  args: {},
  returns: v.array(v.object({ id: v.id("users"), password: v.string() })),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.password !== undefined)
      .map((u) => ({ id: u._id, password: u.password! }));
  },
});

// Escribe el hash calculado por la migración. Relee el documento completo
// vía `ctx.db.get` y hace `replace` (no `patch`) a partir de ESE documento
// completo — nunca reconstruye el documento desde datos parciales que le
// pase la action, para no perder ningún campo existente (nombre, rol, etc.)
// ni dejar `password` a medio borrar. Idempotente: si el usuario ya no tiene
// `password` (ya migrado), no hace nada — en la práctica no debería
// llamarse dos veces para el mismo usuario porque `listUsersWithPlaintextPassword`
// ya no lo devolvería.
export const applyPasswordHash = internalMutation({
  args: { userId: v.id("users"), passwordHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, passwordHash }) => {
    const user = await ctx.db.get(userId);
    if (!user || user.password === undefined) return null;

    // Construido campo a campo (no destructuring del documento vivo) para
    // que quede explícito qué se preserva — `replace` sustituye el
    // documento entero, así que omitir algo aquí lo borraría de verdad.
    await ctx.db.replace(userId, {
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      passwordHash,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      lastResetRequestAt: user.lastResetRequestAt,
      passwordChangedAt: user.passwordChangedAt,
    });
    return null;
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
