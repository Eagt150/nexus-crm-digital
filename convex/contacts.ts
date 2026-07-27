import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./mockSession";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CANAL_ORIGEN = v.union(
  v.literal("web"),
  v.literal("redes"),
  v.literal("email"),
  v.literal("whatsapp")
);
const ESTADO_CLIENTE = v.union(
  v.literal("activo"),
  v.literal("seguimiento"),
  v.literal("inactivo")
);

// "" (input vacío) se normaliza a `undefined` para que ctx.db.patch() borre
// el campo en vez de dejarlo con un string vacío o con el valor anterior.
function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Compartida por create y update: nombre obligatorio, email con formato
// válido si viene informado, y al menos un medio de contacto (teléfono o
// email) tras aplicar los cambios — igual al crear que al editar, para que
// no se pueda dejar un contacto inválido editándolo.
function assertContactoValido(nombre: string, telefono?: string, email?: string) {
  if (!nombre) throw new Error("El nombre es obligatorio.");
  if (email && !EMAIL_RE.test(email)) throw new Error("Email no válido.");
  if (!telefono && !email) throw new Error("Indica al menos un teléfono o un email.");
}

// `propietaria` ve todos los contactos; `comercial` solo los que tienen al
// menos un seguimiento a su nombre, o que él mismo dio de alta (mismo
// contrato que contacts.getById).
async function visibleContacts(ctx: QueryCtx, currentUser: Doc<"users">) {
  const contacts = await ctx.db.query("contacts").collect();
  if (currentUser.rol === "propietaria") return contacts;

  const ownSeguimientos = await ctx.db
    .query("seguimientos")
    .filter((q) => q.eq(q.field("responsable"), currentUser._id))
    .collect();
  const ownClienteIds = new Set(ownSeguimientos.map((s) => s.clienteId));
  return contacts.filter((c) => ownClienteIds.has(c._id) || c.creadoPor === currentUser._id);
}

// Fecha (ISO) de la interacción más reciente de un cliente, o null si no
// tiene ninguna registrada todavía.
async function lastInteractionISO(ctx: QueryCtx, clienteId: Doc<"contacts">["_id"]) {
  const interacciones = await ctx.db
    .query("interacciones")
    .withIndex("by_cliente", (q) => q.eq("clienteId", clienteId))
    .collect();
  if (interacciones.length === 0) return null;
  return interacciones.reduce((latest, i) => (i.fecha > latest ? i.fecha : latest), interacciones[0].fecha);
}

// Chequeo de visibilidad compartido por getById/loadAuthorizedContact y por
// las queries listByCliente de interacciones/seguimientos/ventas:
// `propietaria` ve cualquier contacto; `comercial` solo los que tienen al
// menos un seguimiento a su nombre, o que él mismo dio de alta.
export async function isContactVisible(
  ctx: QueryCtx | MutationCtx,
  contact: Doc<"contacts">,
  currentUser: Doc<"users">
): Promise<boolean> {
  if (currentUser.rol === "propietaria") return true;
  const ownFollowUp = await ctx.db
    .query("seguimientos")
    .withIndex("by_cliente", (q) => q.eq("clienteId", contact._id))
    .filter((q) => q.eq(q.field("responsable"), currentUser._id))
    .first();
  const ownCreated = contact.creadoPor === currentUser._id;
  return ownFollowUp !== null || ownCreated;
}

// Devuelve los campos que la cabecera de la ficha (MCP-32) y el precargado
// de ClienteForm mode="edit" necesitan. No distingue "no existe" de "no
// autorizado" (ambos devuelven null) para no filtrar por la respuesta si un
// id es válido o no. `estado` se devuelve tal cual lo guarda el schema
// (string suelto, no la unión cerrada) — acotarlo es responsabilidad del
// frontend (ver `parseEstadoCliente` en `src/lib/estado.ts`).
export const getById = query({
  args: { id: v.id("contacts") },
  returns: v.union(
    v.object({
      id: v.id("contacts"),
      nombre: v.string(),
      empresa: v.optional(v.string()),
      telefono: v.optional(v.string()),
      email: v.optional(v.string()),
      canalOrigen: v.optional(CANAL_ORIGEN),
      nota: v.optional(v.string()),
      estado: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, { id }) => {
    const contact = await ctx.db.get(id);
    if (!contact) return null;

    const currentUser = await requireCurrentUser(ctx);
    if (!(await isContactVisible(ctx, contact, currentUser))) return null;

    return {
      id: contact._id,
      nombre: contact.nombre,
      empresa: contact.empresa,
      telefono: contact.telefono,
      email: contact.email,
      canalOrigen: contact.canalOrigen,
      nota: contact.nota,
      estado: contact.estado,
    };
  },
});

// Autoriza y carga un contacto para mutarlo (o para insertar actividad sobre
// él: interacciones/seguimientos/ventas), con el mismo contrato de
// visibilidad que getById/list (ver `isContactVisible`). No distingue "no
// existe" de "no autorizado" en el mensaje de error, para no filtrar por la
// respuesta si un id es válido. A diferencia de las queries de lectura (que
// devuelven null/[] y nunca lanzan), esta función SÍ lanza porque solo la
// usan mutations.
export async function loadAuthorizedContact(ctx: QueryCtx | MutationCtx, id: Id<"contacts">) {
  const currentUser = await requireCurrentUser(ctx);
  const contact = await ctx.db.get(id);
  if (!contact) throw new Error("No autorizado");
  if (!(await isContactVisible(ctx, contact, currentUser))) throw new Error("No autorizado");

  return contact;
}

export const create = mutation({
  args: {
    nombre: v.string(),
    empresa: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    canalOrigen: v.optional(CANAL_ORIGEN),
    nota: v.optional(v.string()),
  },
  returns: v.id("contacts"),
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    const nombre = args.nombre.trim();
    const telefono = normalizeOptional(args.telefono);
    const email = normalizeOptional(args.email);
    assertContactoValido(nombre, telefono, email);

    return await ctx.db.insert("contacts", {
      nombre,
      empresa: normalizeOptional(args.empresa),
      telefono,
      email,
      canalOrigen: args.canalOrigen,
      nota: normalizeOptional(args.nota),
      creadoPor: currentUser._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    nombre: v.string(),
    empresa: v.optional(v.string()),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    canalOrigen: v.optional(CANAL_ORIGEN),
    nota: v.optional(v.string()),
    estado: v.optional(ESTADO_CLIENTE),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await loadAuthorizedContact(ctx, args.id);
    const nombre = args.nombre.trim();
    const telefono = normalizeOptional(args.telefono);
    const email = normalizeOptional(args.email);
    assertContactoValido(nombre, telefono, email);

    await ctx.db.patch(args.id, {
      nombre,
      empresa: normalizeOptional(args.empresa),
      telefono,
      email,
      canalOrigen: args.canalOrigen,
      nota: normalizeOptional(args.nota),
      estado: args.estado,
    });
    return null;
  },
});

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("contacts"),
      nombre: v.string(),
      empresa: v.optional(v.string()),
      telefono: v.optional(v.string()),
      email: v.optional(v.string()),
      estado: v.optional(v.string()),
      ultimoContacto: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    const contacts = await visibleContacts(ctx, currentUser);

    const withLastContact = await Promise.all(
      contacts.map(async (c) => ({
        id: c._id,
        nombre: c.nombre,
        empresa: c.empresa,
        telefono: c.telefono,
        email: c.email,
        estado: c.estado,
        ultimoContacto: await lastInteractionISO(ctx, c._id),
      }))
    );

    return withLastContact.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  },
});
