import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Field/table names mirror the "State Management" section of the design
// handoff: Prototipo del CRM - Claude Design/design_handoff_crm_pwa/README.md

export default defineSchema({
  users: defineTable({
    nombre: v.string(),
    email: v.string(),
    rol: v.union(v.literal("propietaria"), v.literal("comercial")),
    // DEMO ONLY — texto plano a propósito: no hay auth real todavía (ver
    // convex/mockSession.ts). INTEGRATION POINT (MCP-28): eliminar este
    // campo cuando el proveedor de auth real gestione credenciales.
    password: v.optional(v.string()),
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
