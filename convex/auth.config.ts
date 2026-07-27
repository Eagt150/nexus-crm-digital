// Declara el proveedor JWT custom que Convex debe confiar para verificar la
// sesión que firma Next.js/Auth.js (ver auth.ts en la raíz del repo y
// convex/http.ts, que sirve el JWKS público referenciado aquí). `applicationID`
// se valida contra el claim `aud` del JWT — omitirlo dejaría la verificación
// insegura (Convex aceptaría JWTs de cualquier audiencia).
const authConfig = {
  providers: [
    {
      type: "customJwt",
      applicationID: "convex",
      issuer: process.env.CONVEX_SITE_URL,
      jwks: `${process.env.CONVEX_SITE_URL}/.well-known/jwks.json`,
      algorithm: "RS256",
    },
  ],
};

export default authConfig;
