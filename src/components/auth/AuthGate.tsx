"use client";

import { useConvexAuth } from "convex/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

// Sesión real de Auth.js (Google + credenciales) — reemplaza la sesión de
// localStorage sin firma que había antes. Ojo: Auth.js y Convex tienen
// procesos de autenticación DISTINTOS y no sincronizados automáticamente.
// `useSession()` puede reportar "authenticated" antes de que Convex termine
// de aplicar el JWT a su propia conexión (ver ConvexClientProvider.tsx); si
// renderizamos los hijos en ese momento, sus queries se disparan sin
// identidad todavía y explotan contra `requireCurrentUser` en el backend.
// `useConvexAuth()` (de convex/react) refleja el estado de auth interno de
// Convex mismo, así que hay que esperar a AMBOS antes de renderizar.
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const { isLoading: convexLoading, isAuthenticated: convexAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;
  if (convexLoading || !convexAuthenticated) return null;
  return <>{children}</>;
}
