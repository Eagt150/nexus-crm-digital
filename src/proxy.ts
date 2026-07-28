import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "crm-vibe.com";

// El login con Google usa cookies propias de cada dominio (PKCE). Si alguien
// empieza sesión en un dominio y Auth.js completa el flujo en otro (AUTH_URL
// fuerza un único origen canónico), la cookie no viaja y el login revienta.
// Se evita por completo redirigiendo cualquier host que no sea el canónico
// antes de que la petición llegue a la lógica de auth.
export function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0];
  if (hostname !== CANONICAL_HOST && hostname !== "localhost") {
    const url = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      `https://${CANONICAL_HOST}`
    );
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
