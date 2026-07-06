import { mutation } from "./_generated/server";
import { MOCK_SESSION_EMAIL } from "./mockSession";

const CARLOS_EMAIL = "carlos@vibecrm.dev";

// DEMO ONLY — inserta datos ficticios para verificar la conexión con Convex
// desde el dashboard. Borra estas mutations y las filas que crean cuando ya
// no las necesites.
//
// Las tres mutations validan el estado exacto que esperan (no solo "¿hay
// alguna fila?"): si la tabla está vacía, siembran; si ya tiene exactamente
// lo esperado, no hacen nada (idempotente); si el estado es parcial/
// inconsistente, lanzan un error explícito en vez de adivinar.
export const seedDemoContacts = mutation({
  args: {},
  handler: async (ctx) => {
    const demoContacts = [
      {
        nombre: "Laura Martínez",
        empresa: "Panadería El Trigal",
        telefono: "+34 611 222 333",
        email: "laura@eltrigal.es",
        canalOrigen: "web" as const,
        nota: "Interesada en el plan mensual.",
        estado: "activo",
      },
      {
        nombre: "Carlos Ruiz",
        empresa: "Ruiz Consultoría",
        telefono: "+34 622 333 444",
        email: "carlos@ruizconsultoria.com",
        canalOrigen: "redes" as const,
        nota: "Pidió una demo la semana pasada.",
        estado: "seguimiento",
      },
      {
        nombre: "Marta Gómez",
        empresa: undefined,
        telefono: "+34 633 444 555",
        email: "marta.gomez@gmail.com",
        canalOrigen: "whatsapp" as const,
        nota: "Cliente particular, primera compra.",
        estado: "activo",
      },
      {
        nombre: "Javier Torres",
        empresa: "Torres & Asociados",
        telefono: "+34 644 555 666",
        email: "javier@torresyasociados.es",
        canalOrigen: "email" as const,
        nota: "Sin respuesta tras el último contacto.",
        estado: "inactivo",
      },
      {
        nombre: "Elena Vidal",
        empresa: "Vidal Studio",
        telefono: "+34 655 666 777",
        email: "elena@vidalstudio.com",
        canalOrigen: "web" as const,
        nota: "Cliente recurrente, muy satisfecha.",
        estado: "activo",
      },
    ];

    const existing = await ctx.db.query("contacts").collect();
    if (existing.length === demoContacts.length) return existing.map((c) => c._id);
    if (existing.length !== 0) {
      throw new Error(
        "Estado de `contacts` inconsistente para el seed demo — borra la tabla manualmente desde el dashboard antes de re-sembrar."
      );
    }

    const ids = [];
    for (const contact of demoContacts) {
      ids.push(await ctx.db.insert("contacts", contact));
    }
    return ids;
  },
});

export const seedDemoUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const marta = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", MOCK_SESSION_EMAIL))
      .unique();
    const carlos = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", CARLOS_EMAIL))
      .unique();

    if (marta && carlos) return { marta: marta._id, carlos: carlos._id };
    if (marta || carlos) {
      throw new Error(
        "Estado de `users` inconsistente para el seed demo (falta uno de los dos usuarios demo) — revisa la tabla desde el dashboard."
      );
    }

    const martaId = await ctx.db.insert("users", {
      nombre: "Marta López",
      email: MOCK_SESSION_EMAIL,
      rol: "propietaria",
    });
    const carlosId = await ctx.db.insert("users", {
      nombre: "Carlos Ruiz Comercial",
      email: CARLOS_EMAIL,
      rol: "comercial",
    });
    return { marta: martaId, carlos: carlosId };
  },
});

export const seedDemoSeguimientos = mutation({
  args: {},
  handler: async (ctx) => {
    const contacts = await ctx.db.query("contacts").collect();
    if (contacts.length !== 5) {
      throw new Error("Corre seedDemoContacts primero (se esperan exactamente 5 contactos).");
    }

    const marta = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", MOCK_SESSION_EMAIL))
      .unique();
    const carlos = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", CARLOS_EMAIL))
      .unique();
    if (!marta || !carlos) {
      throw new Error("Corre seedDemoUsers primero (faltan Marta y/o Carlos).");
    }

    const existing = await ctx.db.query("seguimientos").collect();
    if (existing.length >= 5) return existing.map((s) => s._id);
    if (existing.length !== 0) {
      throw new Error(
        "Estado de `seguimientos` inconsistente para el seed demo — borra la tabla manualmente desde el dashboard antes de re-sembrar."
      );
    }

    const today = new Date();
    const iso = (deltaDays: number) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + deltaDays);
      return d.toISOString().slice(0, 10);
    };

    const rows = [
      {
        clienteId: contacts[0]._id,
        accion: "Llamar para confirmar el pedido",
        vence: iso(-1),
        hecho: false,
        responsable: marta._id,
      },
      {
        clienteId: contacts[1]._id,
        accion: "Enviar propuesta actualizada",
        vence: iso(-3),
        hecho: false,
        responsable: carlos._id,
      },
      {
        clienteId: contacts[2]._id,
        accion: "Resolver duda sobre el precio",
        vence: iso(0),
        hecho: false,
        responsable: marta._id,
      },
      {
        clienteId: contacts[3]._id,
        accion: "Confirmar horario de la reunión",
        vence: iso(0),
        hecho: false,
        responsable: carlos._id,
      },
      {
        // Deliberadamente para el día siguiente: no debe aparecer en Hoy.
        clienteId: contacts[4]._id,
        accion: "Revisar satisfacción tras la entrega",
        vence: iso(1),
        hecho: false,
        responsable: marta._id,
      },
    ];

    const ids = [];
    for (const row of rows) {
      ids.push(await ctx.db.insert("seguimientos", row));
    }
    return ids;
  },
});
