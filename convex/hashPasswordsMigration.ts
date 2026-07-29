"use node";

import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Migración de un solo uso (MCP-78): hashea con bcrypt cualquier `password`
// en texto plano que quede en `users` y lo mueve a `passwordHash`. No toca
// `passwordChangedAt` — si lo hiciera, invalidaría de golpe (ver
// convex/mockSession.ts) todas las sesiones activas en el momento del
// deploy, que no es la intención de esta migración (solo cambia CÓMO se
// guarda la contraseña, no obliga a nadie a volver a loguearse).
//
// Es una action (no mutation) porque bcrypt necesita el runtime Node de
// Convex; por eso no tiene `ctx.db` y orquesta vía runQuery/runMutation
// contra convex/users.ts. Correr una vez contra dev y una vez contra prod:
//   npx convex run hashPasswordsMigration:run
//   npx convex run hashPasswordsMigration:run --prod
// Solo después de confirmar (ej. `npx convex data users`) que ya no queda
// ningún documento con `password`, se retira ese campo del schema (A3).
export const run = action({
  args: {},
  returns: v.object({ migrated: v.number() }),
  handler: async (ctx): Promise<{ migrated: number }> => {
    const pending = await ctx.runQuery(internal.users.listUsersWithPlaintextPassword, {});

    for (const { id, password } of pending) {
      const passwordHash = await bcrypt.hash(password, 10);
      await ctx.runMutation(internal.users.applyPasswordHash, { userId: id, passwordHash });
    }

    return { migrated: pending.length };
  },
});
