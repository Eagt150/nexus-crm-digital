"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { hasSession } from "@/lib/session";

function subscribe() {
  // localStorage no dispara eventos en la misma pestaña que la modifica;
  // no hace falta escuchar cambios en vivo, solo leer el valor una vez
  // después de montar (ver getSnapshot).
  return () => {};
}

function getServerSnapshot() {
  return false;
}

// INTEGRATION POINT (MCP-28): reemplazar por la comprobación de sesión real
// (server-side, vía middleware o layout de servidor) cuando exista un
// proveedor de auth. Hoy solo mira si `/login` guardó algo en localStorage.
// `useSyncExternalStore` evita el desajuste de hidratación: el servidor
// siempre "ve" `false` (no hay `window`) y el cliente relee el valor real
// justo después de montar.
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const sessionPresent = useSyncExternalStore(subscribe, hasSession, getServerSnapshot);

  useEffect(() => {
    // OJO: comprobar `hasSession()` en vivo, no cerrar sobre `sessionPresent`.
    // En un montaje "duro" (URL directa o refresh) este efecto puede correr
    // en el mismo commit que la resincronización interna de
    // `useSyncExternalStore` (que aún no terminó de propagar el valor real
    // a `sessionPresent` en este render). Si este efecto confiaba en la
    // variable cerrada, veía el `false` inicial del servidor y redirigía a
    // /login aunque sí hubiera sesión.
    if (!hasSession()) router.replace("/login");
  }, [router]);

  if (!sessionPresent) return null;
  return <>{children}</>;
}
