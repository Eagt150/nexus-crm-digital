"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// DEMO ONLY — ver convex/mockSession.ts. Debe coincidir con MOCK_SESSION_EMAIL
// ahí. Esto es puramente para la UI (qué nombre/rol mostrar, qué ítems de
// navegación filtrar); la autorización real de datos vive en el servidor.
export const MOCK_SESSION_EMAIL = "marta@vibecrm.dev";

const SESSION_KEY = "vibecrm_session";

export interface StoredSession {
  id: Id<"users">;
  nombre: string;
  email: string;
  rol: "propietaria" | "comercial";
}

// DEMO ONLY — sesión en localStorage sin ningún token/firma: cualquiera con
// acceso al navegador puede editarla. Sirve solo para recordar que
// `/login` se completó y qué usuario se usó, mientras no exista un
// proveedor de auth real. INTEGRATION POINT (MCP-28): sustituir por las
// cookies/sesión que gestione ese proveedor.
export function saveSession(user: StoredSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function hasSession(): boolean {
  return readSession() !== null;
}

export function useCurrentUser() {
  // INTEGRATION POINT (MCP-28): sustituir por sesión real cuando exista
  // login multiusuario en el servidor. Hoy el backend siempre resuelve al
  // usuario mock (Marta); /login solo controla si se puede entrar o no.
  return useQuery(api.users.getCurrentUser, {});
}

export function signOutStub() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.location.href = "/login";
}
