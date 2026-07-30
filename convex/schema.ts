import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Field/table names mirror the "State Management" section of the design
// handoff: Prototipo del CRM - Claude Design/design_handoff_crm_pwa/README.md

export default defineSchema({
  users: defineTable({
    nombre: v.string(),
    email: v.string(),
    rol: v.union(v.literal("propietaria"), v.literal("comercial")),
    // DEPRECATED (MCP-78) — texto plano. Ningún código nuevo lee/escribe
    // este campo (usar `passwordHash`); se queda en el schema a propósito
    // hasta confirmar que hashPasswordsMigration corrió también en PROD —
    // si se quitara antes, el primer deploy a prod fallaría (Convex valida
    // el schema contra los documentos ya existentes, que ahí todavía tienen
    // `password` hasta que la migración corra). Retirarlo del schema es un
    // paso separado y pequeño, después de confirmar la migración en prod.
    password: v.optional(v.string()),
    // bcrypt. Ausente = cuenta solo-Google (nunca tuvo login por contraseña).
    passwordHash: v.optional(v.string()),
    // Rate limiting de `login` (convex/authActions.ts) — MCP-78.
    failedLoginAttempts: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
    // Cooldown de `requestReset` (convex/passwordReset.ts) — MCP-78.
    lastResetRequestAt: v.optional(v.number()),
    // Estampado en cada reset real (nunca en la migración inicial) para
    // poder invalidar sesiones/tokens de Convex emitidos antes del cambio
    // de contraseña — ver convex/mockSession.ts.
    passwordChangedAt: v.optional(v.number()),
    // Gestión de usuarios (MCP-72). Ausente = activo (mismo idioma que
    // `passwordHash` ausente = "solo Google"). "Eliminar" un usuario desde
    // /equipo en realidad pone esto en `false` (soft-delete): bloquea login
    // (Google y contraseña) y sesiones ya abiertas de inmediato, sin borrar
    // la fila — `seguimientos.responsable`/`ventas.autor`/`interacciones.autor`
    // la referencian de forma obligatoria, y un borrado real dejaría esas
    // filas huérfanas (varias queries ya descartan en silencio lo que no
    // resuelve).
    activo: v.optional(v.boolean()),
    // Estampado en el primer login exitoso y en cada uno después (Google o
    // contraseña) — distingue "invitad@ pero nunca entró" ("Pendiente de
    // entrar" en /equipo) de alguien que ya usó el CRM alguna vez. Ausente
    // = nunca inició sesión.
    lastLoginAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  contacts: defineTable({
    nombre: v.string(),
    empresa: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    canalOrigen: v.optional(
      v.union(v.literal("web"), v.literal("redes"), v.literal("email"), v.literal("whatsapp"))
    ),
    nota: v.optional(v.string()),
    estado: v.optional(v.string()),
    // Quién dio de alta el contacto. Permite que un `comercial` vea sus
    // propios clientes recién creados aunque todavía no tengan ningún
    // seguimiento asignado (ver visibleContacts en contacts.ts).
    creadoPor: v.optional(v.id("users")),
  }).index("by_nombre", ["nombre"]),

  seguimientos: defineTable({
    clienteId: v.id("contacts"),
    accion: v.string(),
    vence: v.string(), // ISO date (YYYY-MM-DD)
    hecho: v.boolean(),
    fechaHecho: v.optional(v.string()),
    responsable: v.id("users"),
  })
    .index("by_cliente", ["clienteId"])
    .index("by_vence", ["vence"])
    .index("by_hecho_vence", ["hecho", "vence"]),

  interacciones: defineTable({
    clienteId: v.id("contacts"),
    tipo: v.union(
      v.literal("llamada"),
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("en_persona")
    ),
    texto: v.string(),
    fecha: v.string(), // ISO date
    autor: v.id("users"),
  }).index("by_cliente", ["clienteId"]),

  ventas: defineTable({
    clienteId: v.id("contacts"),
    concepto: v.string(),
    importe: v.number(),
    estado: v.union(v.literal("oportunidad"), v.literal("ganada"), v.literal("perdida")),
    fecha: v.string(), // ISO date
    autor: v.id("users"),
  }).index("by_cliente", ["clienteId"]),

  // Solo aplica al login por contraseña (Credentials) — MCP-77. `token` es
  // de un solo uso y de alta entropía (32 bytes aleatorios), así que no
  // hace falta hashearlo para que esta tabla sea segura contra fuerza bruta.
  // `code` (6 dígitos) es la alternativa manual al link — tiene mucha menos
  // entropía, por eso `attempts` limita cuántas veces se puede probar antes
  // de invalidarlo (ver MAX_CODE_ATTEMPTS en convex/passwordReset.ts).
  passwordResets: defineTable({
    userId: v.id("users"),
    token: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    attempts: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),
});
