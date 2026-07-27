import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Sirve el JWKS público (mitad pública del keypair RSA que firma el JWT en
// auth.ts) para que convex/auth.config.ts pueda verificar criptográficamente
// las sesiones emitidas por Next.js/Auth.js. El valor viene de la variable
// de entorno JWKS (`npx convex env set JWKS '<jwk-set-json>'`), distinta por
// deployment — nunca se commitea la clave privada correspondiente.
http.route({
  path: "/.well-known/jwks.json",
  method: "GET",
  handler: httpAction(async () => {
    const jwks = process.env.JWKS;
    if (!jwks) {
      return new Response("JWKS no configurado", { status: 500 });
    }
    return new Response(jwks, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
