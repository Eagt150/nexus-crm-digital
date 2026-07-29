"use client";

import { useSyncExternalStore } from "react";

// sessionStorage (no la URL) para pasar el email entre /forgot-password y
// /reset-password sin dejarlo en el historial del navegador. `storage` no
// se dispara en la misma pestaña que hace el cambio, así que se completa
// con un evento propio para que useSyncExternalStore lo detecte al instante.
const KEY = "resetEmail";
const EVENT = "reset-email-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function getSnapshot() {
  return sessionStorage.getItem(KEY);
}

function getServerSnapshot() {
  return null;
}

export function useResetEmail() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setResetEmail(email: string) {
  sessionStorage.setItem(KEY, email);
  window.dispatchEvent(new Event(EVENT));
}

export function clearResetEmail() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}
