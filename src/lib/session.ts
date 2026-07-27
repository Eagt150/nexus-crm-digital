"use client";

import { useQuery } from "convex/react";
import { useSession } from "next-auth/react";
import { api } from "../../convex/_generated/api";

// Identidad real: Convex resuelve nombre/rol/email consultando su propia
// tabla `users` por el email del JWT ya verificado (ver
// convex/mockSession.ts) — nunca confía en nada que venga del cliente más
// allá de "hay una sesión de Auth.js activa". `skip` evita disparar la
// query mientras Auth.js todavía está resolviendo el estado de la sesión.
export function useCurrentUser() {
  const { status } = useSession();
  return useQuery(api.users.getCurrentUser, status === "authenticated" ? {} : "skip");
}
