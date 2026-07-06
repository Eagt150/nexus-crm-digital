"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

// DEMO ONLY — ver convex/mockSession.ts. Debe coincidir con MOCK_SESSION_EMAIL
// ahí. Esto es puramente para la UI (qué nombre/rol mostrar, qué ítems de
// navegación filtrar); la autorización real de datos vive en el servidor.
export const MOCK_SESSION_EMAIL = "marta@vibecrm.dev";

export function useCurrentUser() {
  // INTEGRATION POINT (MCP-28): sustituir por sesión real cuando exista login.
  return useQuery(api.users.getCurrentUser, {});
}

export function signOutStub() {
  // INTEGRATION POINT (MCP-28): reemplazar por el signOut real del auth provider.
}
