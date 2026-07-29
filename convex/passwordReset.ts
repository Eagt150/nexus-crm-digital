import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeEmail } from "./mockSession";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
// El código de 6 dígitos tiene mucha menos entropía que el token del link,
// así que se bloquea tras unos pocos intentos fallidos para que no sea
// practicable por fuerza bruta dentro de la hora que dura vivo.
const MAX_CODE_ATTEMPTS = 5;
// Cooldown entre solicitudes de reset del mismo usuario (MCP-78) — evita
// bombardear su correo y, más importante, evita que se pueda "resetear" el
// contador de intentos del código pidiendo uno nuevo sin límite.
const RESET_COOLDOWN_MS = 45 * 1000;

type ResetMethod = "link" | "code";

// APP_URL es distinta por deployment de Convex (dev -> localhost, prod ->
// crm-vibe.com), igual que JWKS/PROVISION_CHECK_SECRET — así el link del
// correo apunta siempre al mismo sitio donde se generó el token.
function resetBaseUrl() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL no configurado en este deployment de Convex");
  return `${appUrl}/reset-password`;
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

// Comparación de tiempo constante para el código de 6 dígitos (MCP-78) —
// cierra el canal lateral de timing de la comparación `!==` normal. Ya
// limitado en la práctica por MAX_CODE_ATTEMPTS, pero es una capa más.
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// El correo solo muestra la opción que el usuario eligió al pedir la
// recuperación (link o código) — son dos flujos que se presentan como
// alternativas separadas, no un combo. El token/código no elegido se genera
// igual por simplicidad interna, pero nunca se envía ni se expone.
async function sendResetEmail(to: string, method: ResetMethod, token: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no configurado en este deployment de Convex");

  const body =
    method === "link"
      ? `<p>Solicitaste restablecer tu contraseña en Vibe CRM.</p>
<p><a href="${resetBaseUrl()}?token=${token}">Haz clic aquí para elegir una nueva contraseña</a>. El enlace caduca en 1 hora.</p>
<p>Si no fuiste tú, ignora este correo — tu contraseña actual sigue siendo válida.</p>`
      : `<p>Solicitaste restablecer tu contraseña en Vibe CRM.</p>
<p>Introduce este código en la app: <strong style="font-size:20px;letter-spacing:2px">${code}</strong>. Caduca en 1 hora.</p>
<p>Si no fuiste tú, ignora este correo — tu contraseña actual sigue siendo válida.</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Vibe CRM <noreply@crm-vibe.com>",
      to: [to],
      subject: "Recupera tu contraseña en Vibe CRM",
      html: body,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend respondió ${res.status}: ${text}`);
  }
}

export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.object({ id: v.id("users"), email: v.string() }), v.null()),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) return null;
    return { id: user._id, email: user.email };
  },
});

// Fuente de verdad única para "¿se puede crear un reset nuevo?" — relee en
// vivo `passwordHash` (gate Google-only) y `lastResetRequestAt` (cooldown)
// dentro de sí misma, y solo si ambos pasan crea el registro y actualiza el
// cooldown, todo en la misma transacción. Así dos llamadas concurrentes no
// pueden "leer cooldown viejo" las dos y mandar dos correos.
export const tryCreateResetRequest = internalMutation({
  args: { userId: v.id("users"), token: v.string(), code: v.string(), expiresAt: v.number() },
  returns: v.union(v.literal("created"), v.literal("cooldown"), v.literal("google-only")),
  handler: async (ctx, { userId, token, code, expiresAt }) => {
    const user = await ctx.db.get(userId);
    if (!user || !user.passwordHash) return "google-only";

    const now = Date.now();
    if (user.lastResetRequestAt !== undefined && now - user.lastResetRequestAt < RESET_COOLDOWN_MS) {
      return "cooldown";
    }

    const stale = await ctx.db
      .query("passwordResets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const record of stale) {
      if (!record.usedAt) await ctx.db.delete(record._id);
    }
    await ctx.db.insert("passwordResets", { userId, token, code, expiresAt });
    await ctx.db.patch(userId, { lastResetRequestAt: now });
    return "created";
  },
});

// Acción pública: recibe un email y el método elegido (link o código) y, si
// corresponde a un usuario existente con contraseña propia, crea el
// token+código y envía el correo con Resend mostrando solo el método
// pedido. "not-found"/"google-only" se muestran explícitos al usuario
// (decisión de producto: priorizar claridad sobre ocultar qué emails
// existen — a diferencia del gate de Google en checkProvisioned).
export const requestReset = action({
  args: { email: v.string(), method: v.union(v.literal("link"), v.literal("code")) },
  returns: v.union(
    v.literal("sent"),
    v.literal("not-found"),
    v.literal("google-only"),
    v.literal("rate-limited")
  ),
  handler: async (
    ctx,
    { email, method }
  ): Promise<"sent" | "not-found" | "google-only" | "rate-limited"> => {
    const normalized = normalizeEmail(email);
    const user = await ctx.runQuery(internal.passwordReset.findUserByEmail, {
      email: normalized,
    });
    if (!user) return "not-found";

    const token = generateToken();
    const code = generateCode();
    const result = await ctx.runMutation(internal.passwordReset.tryCreateResetRequest, {
      userId: user.id,
      token,
      code,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });
    if (result === "cooldown") return "rate-limited";
    if (result === "google-only") return "google-only";

    await sendResetEmail(user.email, method, token, code);
    return "sent";
  },
});

// Las siguientes dos mutations son la última palabra al confirmar un reset
// (llamadas desde convex/passwordResetActions.ts, que ya calculó el hash de
// bcrypt). Relee todo en vivo — token/código, usedAt, expiración, intentos,
// y si el usuario todavía tiene `passwordHash` — justo antes de escribir,
// para que dos confirmaciones concurrentes con el mismo token/código nunca
// puedan "ganar" las dos. El gate Google-only aquí es una segunda capa
// (la primera es tryCreateResetRequest, al pedir): cierra la ventana de un
// token/código ya emitido antes de que la cuenta perdiera su contraseña, o
// emitido antes de este deploy. De cara al usuario, este caso se muestra
// con el mismo mensaje genérico de "inválido" que cualquier otro rechazo en
// el paso de confirmar — no se distingue, para no abrir un canal nuevo de
// enumeración en este punto (el aviso explícito de "esta cuenta usa
// Google" solo vive en el paso de *pedir* el reset).

export const finalizeByToken = internalMutation({
  args: { token: v.string(), passwordHash: v.string() },
  returns: v.union(v.literal("ok"), v.literal("invalid"), v.literal("expired")),
  handler: async (ctx, { token, passwordHash }) => {
    const record = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!record || record.usedAt) return "invalid";
    if (record.expiresAt < Date.now()) return "expired";

    const user = await ctx.db.get(record.userId);
    if (!user || !user.passwordHash) return "invalid";

    // Un reset exitoso también limpia el bloqueo de intentos fallidos de
    // login: quien completó este flujo ya demostró ser el dueño de la
    // cuenta por un canal independiente (su correo), así que no tiene
    // sentido hacerlo esperar el resto del lockout de todos modos.
    await ctx.db.patch(record.userId, {
      passwordHash,
      passwordChangedAt: Date.now(),
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });
    await ctx.db.patch(record._id, { usedAt: Date.now() });
    return "ok";
  },
});

export const finalizeByCode = internalMutation({
  args: { email: v.string(), code: v.string(), passwordHash: v.string() },
  returns: v.union(v.literal("ok"), v.literal("invalid"), v.literal("expired")),
  handler: async (ctx, { email, code, passwordHash }) => {
    const normalized = normalizeEmail(email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (!user || !user.passwordHash) return "invalid";

    const records = await ctx.db
      .query("passwordResets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const record = records.find((r) => !r.usedAt);
    if (!record) return "invalid";
    if (record.expiresAt < Date.now()) return "expired";
    if ((record.attempts ?? 0) >= MAX_CODE_ATTEMPTS) return "invalid";

    if (!timingSafeEqual(record.code, code)) {
      await ctx.db.patch(record._id, { attempts: (record.attempts ?? 0) + 1 });
      return "invalid";
    }

    await ctx.db.patch(user._id, {
      passwordHash,
      passwordChangedAt: Date.now(),
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });
    await ctx.db.patch(record._id, { usedAt: Date.now() });
    return "ok";
  },
});
