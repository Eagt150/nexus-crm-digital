"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Tolerant on purpose: lets the app build/run before `npx convex dev` has
// populated NEXT_PUBLIC_CONVEX_URL. Once it's set, this provides real data.
//
// `initialAuthTokenReuse: true` evita un bucle infinito real y reproducido:
// por defecto (`false`), en cuanto Convex confirma el token ya cacheado
// vuelve a pedir uno fresco DE INMEDIATO (no programado a futuro). Pedir
// un token fresco llama a `update()` de Auth.js, que pone `status` en
// "loading" un instante — eso hace que el efecto de ConvexProviderWithAuth
// se desmonte y remonte (sus deps cambiaron), lo cual vuelve a llamar a
// `client.setAuth(...)`, que por el mismo motivo (`initialAuthTokenReuse`
// en false) vuelve a pedir un token fresco de inmediato... y así
// indefinidamente. Con `true`, Convex reutiliza el token ya confirmado y
// programa el próximo refresco cerca de su expiración real (~1h después),
// en vez de inmediatamente.
const convex = convexUrl ? new ConvexReactClient(convexUrl, { initialAuthTokenReuse: true }) : null;

// Puente entre la sesión de Auth.js y Convex: Convex no confía en la sesión
// de Auth.js directamente, sino en `session.convexToken` — un JWT propio
// que auth.ts firma y que convex/auth.config.ts verifica criptográficamente.
// `forceRefreshToken` (pedido por ConvexProviderWithAuth cuando el token
// anterior expiró) fuerza una re-lectura real de la sesión vía `update()`
// en vez de devolver un token cacheado, para no fallar en silencio al
// expirar.
function useAuthFromNextAuth() {
  const { data: session, status, update } = useSession();

  // `session` (y potencialmente `update`) son valores nuevos en cada render
  // de useSession() aunque el contenido no cambie. `ConvexProviderWithAuth`
  // vuelve a montar el handshake de autenticación completo cada vez que
  // `fetchAccessToken` cambia de identidad — si `update` no es
  // referencialmente estable, eso reintroduce el mismo problema aunque esté
  // fuera del array de deps de `session`. Por eso ambos se leen por ref y
  // `fetchAccessToken` se declara con deps vacías: su identidad nunca
  // cambia en la vida del componente, sin importar cuántas veces
  // useSession() re-renderice.
  const sessionRef = useRef(session);
  const updateRef = useRef(update);
  useEffect(() => {
    sessionRef.current = session;
    updateRef.current = update;
  }, [session, update]);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    if (forceRefreshToken) {
      const refreshed = await updateRef.current();
      return refreshed?.convexToken ?? null;
    }
    return sessionRef.current?.convexToken ?? null;
  }, []);

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    fetchAccessToken,
  };
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return children;
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromNextAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
