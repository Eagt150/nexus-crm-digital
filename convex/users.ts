import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCurrentUserOrNull, normalizeEmail, requireCurrentUser } from "./mockSession";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 min
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SAFE_USER_FIELDS = v.object({
  id: v.id("users"),
  nombre: v.string(),
  email: v.string(),
  rol: v.union(v.literal("propietaria"), v.literal("comercial")),
});

// Igual que SAFE_USER_FIELDS más `tienePassword` — solo `getCurrentUser` lo
// expone (MCP-73, /cuenta): el propio dueño de la fila necesita saber si
// tiene contraseña propia para mostrar/ocultar "Cambiar contraseña" y
// bloquear la edición de su email en cuentas solo-Google. No se añade a
// SAFE_USER_FIELDS en general porque ningún otro caller (equipo, etc.)
// necesita ni debe ver esto de otros usuarios.
const CURRENT_USER_FIELDS = v.object({
  id: v.id("users"),
  nombre: v.string(),
  email: v.string(),
  rol: v.union(v.literal("propietaria"), v.literal("comercial")),
  tienePassword: v.boolean(),
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
  returns: v.union(CURRENT_USER_FIELDS, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    return {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      tienePassword: user.passwordHash !== undefined,
    };
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
    // activo === false (MCP-72, usuario sin acceso desde /equipo) se trata
    // igual que "no existe" — registro cerrado, así que tampoco puede
    // volver a entrar por Google.
    return user !== null && user.activo !== false;
  },
});

// Estampa `lastLoginAt` en un login por Google exitoso — llamada desde
// `checkProvisioned` justo después de confirmar que el usuario existe y
// está activo (MCP-72: distingue "nunca inició sesión" de "ya usó el CRM").
// No-op silencioso si el usuario ya no existe o dejó de estar activo entre
// medio (no debería pasar en el mismo request, pero por si acaso).
export const recordGoogleLoginInternal = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique();
    if (!user || user.activo === false) return null;
    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });
    return null;
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
    const ok = await ctx.runQuery(internal.users.isProvisionedInternal, { email });
    if (ok) await ctx.runMutation(internal.users.recordGoogleLoginInternal, { email });
    return ok;
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
      activo: v.optional(v.boolean()),
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
      activo: user.activo,
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
      await ctx.db.patch(userId, {
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        lastLoginAt: Date.now(),
      });
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
    // MCP-72: no ofrecer como responsable a alguien eliminado. No afecta a
    // los seguimientos que ya le hubieran asignado antes.
    return users
      .filter((u) => u.activo !== false)
      .map((u) => ({ id: u._id, nombre: u.nombre }));
  },
});

const TEAM_USER_FIELDS = v.object({
  id: v.id("users"),
  nombre: v.string(),
  email: v.string(),
  rol: v.union(v.literal("propietaria"), v.literal("comercial")),
  activo: v.boolean(),
  // Ausente = nunca inició sesión ("Pendiente de entrar" en /equipo).
  lastLoginAt: v.optional(v.number()),
});

// Lista de usuarios para la pantalla de Equipo. Restringida a `propietaria`
// en el servidor (no solo en la UI) siguiendo el mismo contrato de
// autorización que el resto de queries de este archivo. Incluye a TODOS
// los usuarios (activos e inactivos) — MCP-72: alguien sin acceso se sigue
// mostrando, con badge "Sin acceso", en vez de desaparecer de la lista.
export const listAll = query({
  args: {},
  returns: v.array(TEAM_USER_FIELDS),
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    if (currentUser.rol !== "propietaria") return [];

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      id: u._id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      activo: u.activo !== false,
      lastLoginAt: u.lastLoginAt,
    }));
  },
});

// --- Gestión de usuarios (MCP-72) ---------------------------------------

// Fuente de verdad única para "¿sigue quedando al menos una propietaria
// activa tras este cambio?" — relee todo en vivo dentro de la misma
// mutation que va a aplicar el cambio (nunca un conteo calculado antes),
// para que dos cambios concurrentes (ej. dos propietarias degradándose/
// eliminándose mutuamente al mismo tiempo) no puedan dejar el equipo sin
// ningún admin: Convex serializa estas mutations sobre la tabla `users`,
// así que la segunda en aplicarse siempre ve el resultado de la primera.
async function assertKeepsActivePropietaria(ctx: MutationCtx, excludeUserId: Id<"users">) {
  const users = await ctx.db.query("users").collect();
  const stillActive = users.some(
    (u) => u._id !== excludeUserId && u.rol === "propietaria" && u.activo !== false
  );
  if (!stillActive) {
    throw new Error("Debe quedar al menos una propietaria activa en el equipo");
  }
}

async function assertEmailAvailable(ctx: MutationCtx, email: string, excludeUserId?: Id<"users">) {
  if (!EMAIL_RE.test(email)) {
    throw new Error("Introduce un email válido");
  }
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  if (existing && existing._id !== excludeUserId) {
    throw new Error("Ya existe un usuario con ese email");
  }
}

// Crea un usuario nuevo como cuenta solo-Google (sin `passwordHash`): en
// cuanto la fila existe, `checkProvisioned` ya lo deja entrar por Google de
// inmediato, sin ningún paso adicional (criterio de aceptación de MCP-72).
// Si en el futuro alguien necesita login por contraseña, ya existe
// "olvidé mi contraseña" para configurarla.
export const createUser = mutation({
  args: {
    nombre: v.string(),
    email: v.string(),
    rol: v.union(v.literal("propietaria"), v.literal("comercial")),
  },
  returns: SAFE_USER_FIELDS,
  handler: async (ctx, { nombre, email, rol }) => {
    const currentUser = await requireCurrentUser(ctx);
    if (currentUser.rol !== "propietaria") {
      throw new Error("Solo la propietaria puede gestionar el equipo");
    }

    const normalized = normalizeEmail(email);
    await assertEmailAvailable(ctx, normalized);

    const id = await ctx.db.insert("users", {
      nombre,
      email: normalized,
      rol,
      activo: true,
    });
    return { id, nombre, email: normalized, rol };
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    nombre: v.string(),
    email: v.string(),
    rol: v.union(v.literal("propietaria"), v.literal("comercial")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, nombre, email, rol }) => {
    const currentUser = await requireCurrentUser(ctx);
    if (currentUser.rol !== "propietaria") {
      throw new Error("Solo la propietaria puede gestionar el equipo");
    }

    const target = await ctx.db.get(userId);
    if (!target) throw new Error("Usuario no encontrado");

    const normalized = normalizeEmail(email);
    await assertEmailAvailable(ctx, normalized, userId);

    if (target.rol === "propietaria" && rol !== "propietaria") {
      await assertKeepsActivePropietaria(ctx, userId);
    }

    await ctx.db.patch(userId, { nombre, email: normalized, rol });
    return null;
  },
});

// Quitar/devolver acceso desde /equipo (MCP-72). Quitar acceso es
// soft-delete (`activo: false`), no borra la fila — ver el comentario del
// campo en convex/schema.ts — y bloquea login (Google y contraseña) y
// sesiones ya abiertas de inmediato. Devolver acceso (`activo: true`) no
// tiene restricciones (nunca puede romper la regla de "al menos una
// propietaria activa", solo ayuda a cumplirla).
export const setUserActive = mutation({
  args: { userId: v.id("users"), activo: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, activo }) => {
    const currentUser = await requireCurrentUser(ctx);
    if (currentUser.rol !== "propietaria") {
      throw new Error("Solo la propietaria puede gestionar el equipo");
    }

    const target = await ctx.db.get(userId);
    if (!target) throw new Error("Usuario no encontrado");

    if (!activo) {
      if (currentUser._id === userId) {
        throw new Error("No puedes quitarte el acceso a ti mismo");
      }
      if (target.rol === "propietaria") {
        await assertKeepsActivePropietaria(ctx, userId);
      }
    }

    await ctx.db.patch(userId, { activo });
    return null;
  },
});

// --- Mi cuenta (MCP-73) --------------------------------------------------

// Autoservicio de "Editar mis datos" en /cuenta — a diferencia de
// `updateUser` (arriba), no toca `rol` ni `activo`: cualquier usuario en
// sesión puede llamar esto sobre sí mismo, así que exponer esos campos aquí
// sería una vía de auto-ascenso de privilegios (un `comercial` podría
// ponerse `propietaria`) o de auto-reactivación tras una baja. Cambiar de
// rol sigue siendo exclusivo de /equipo (propietaria-only).
export const updateMyProfile = mutation({
  args: { nombre: v.string(), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { nombre, email }) => {
    const currentUser = await requireCurrentUser(ctx);
    const normalized = normalizeEmail(email);

    // Cuenta solo-Google (sin passwordHash): su email es el mismo que usa
    // para entrar por Google, verificado en cada login vía
    // `checkProvisioned`. Dejar que lo cambien aquí las desincronizaría de
    // su identidad real de Google y, como el alta está cerrada (nadie puede
    // re-aprovisionarse solo), las dejaría bloqueadas sin forma de volver a
    // entrar. Bloqueado en el servidor, no solo en la UI.
    if (currentUser.passwordHash === undefined && normalized !== currentUser.email) {
      throw new Error("No puedes cambiar el email de una cuenta que entra con Google");
    }

    await assertEmailAvailable(ctx, normalized, currentUser._id);
    await ctx.db.patch(currentUser._id, { nombre, email: normalized });
    return null;
  },
});

// Última escritura de "Cambiar contraseña" en /cuenta — llamada desde
// convex/accountActions.ts#changeMyPassword tras verificar con bcrypt la
// contraseña actual (esta mutation no repite esa verificación: confía en
// que el caller, en el mismo backend, ya la hizo). Mismo patrón que
// `finalizeByToken`/`finalizeByCode` en convex/passwordReset.ts: estampa
// `passwordChangedAt` (invalida tokens de Convex ya emitidos, ver
// convex/mockSession.ts) y limpia el contador de intentos fallidos — quien
// llega hasta aquí ya demostró conocer la contraseña actual.
export const setPasswordHashInternal = internalMutation({
  args: { userId: v.id("users"), passwordHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, passwordHash }) => {
    await ctx.db.patch(userId, {
      passwordHash,
      passwordChangedAt: Date.now(),
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });
    return null;
  },
});
