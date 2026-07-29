import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeEmail } from "./mockSession";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
// El código de 6 dígitos tiene mucha menos entropía que el token del link,
// así que se bloquea tras unos pocos intentos fallidos para que no sea
// practicable por fuerza bruta dentro de la hora que dura vivo.
const MAX_CODE_ATTEMPTS = 5;

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

type ResetMethod = "link" | "code";

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

export const createResetToken = internalMutation({
  args: { userId: v.id("users"), token: v.string(), code: v.string(), expiresAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { userId, token, code, expiresAt }) => {
    // Invalida cualquier link/código pendiente anterior del mismo usuario,
    // así solo el último correo enviado es válido.
    const stale = await ctx.db
      .query("passwordResets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const record of stale) {
      if (!record.usedAt) await ctx.db.delete(record._id);
    }
    await ctx.db.insert("passwordResets", { userId, token, code, expiresAt });
    return null;
  },
});

// Acción pública: recibe un email y el método elegido (link o código) y, si
// corresponde a un usuario existente, crea el token+código y envía el
// correo con Resend mostrando solo el método pedido. Devuelve si el email
// estaba registrado o no — decisión explícita del dueño del producto de
// priorizar claridad para el usuario sobre ocultar qué emails tienen cuenta
// (a diferencia del gate de Google en checkProvisioned, que sí lo oculta).
export const requestReset = action({
  args: { email: v.string(), method: v.union(v.literal("link"), v.literal("code")) },
  returns: v.boolean(),
  handler: async (ctx, { email, method }): Promise<boolean> => {
    const normalized = normalizeEmail(email);
    const user = await ctx.runQuery(internal.passwordReset.findUserByEmail, {
      email: normalized,
    });
    if (!user) return false;

    const token = generateToken();
    const code = generateCode();
    await ctx.runMutation(internal.passwordReset.createResetToken, {
      userId: user.id,
      token,
      code,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });
    await sendResetEmail(user.email, method, token, code);
    return true;
  },
});

// Valida el token del link y, si es válido y no ha expirado ni se usó ya,
// actualiza la contraseña del usuario. `newPassword` demasiado corta se
// trata como error de llamada (validación de UI), no como estado del token.
export const confirmReset = mutation({
  args: { token: v.string(), newPassword: v.string() },
  returns: v.union(v.literal("ok"), v.literal("invalid"), v.literal("expired")),
  handler: async (ctx, { token, newPassword }) => {
    if (newPassword.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");

    const record = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!record || record.usedAt) return "invalid";
    if (record.expiresAt < Date.now()) return "expired";

    await ctx.db.patch(record.userId, { password: newPassword });
    await ctx.db.patch(record._id, { usedAt: Date.now() });
    return "ok";
  },
});

// Misma validación que confirmReset pero por email+código en vez de token —
// para quien prefiera teclear el código del correo en vez de abrir el link.
// Cuenta intentos fallidos por separado del estado del token: tras
// MAX_CODE_ATTEMPTS códigos incorrectos, ese registro queda inválido aunque
// todavía no haya expirado (evita fuerza bruta sobre 1 millón de códigos).
export const confirmResetWithCode = mutation({
  args: { email: v.string(), code: v.string(), newPassword: v.string() },
  returns: v.union(v.literal("ok"), v.literal("invalid"), v.literal("expired")),
  handler: async (ctx, { email, code, newPassword }) => {
    if (newPassword.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");

    const normalized = normalizeEmail(email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (!user) return "invalid";

    const records = await ctx.db
      .query("passwordResets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const record = records.find((r) => !r.usedAt);
    if (!record) return "invalid";
    if (record.expiresAt < Date.now()) return "expired";
    if ((record.attempts ?? 0) >= MAX_CODE_ATTEMPTS) return "invalid";

    if (record.code !== code) {
      await ctx.db.patch(record._id, { attempts: (record.attempts ?? 0) + 1 });
      return "invalid";
    }

    await ctx.db.patch(user._id, { password: newPassword });
    await ctx.db.patch(record._id, { usedAt: Date.now() });
    return "ok";
  },
});
