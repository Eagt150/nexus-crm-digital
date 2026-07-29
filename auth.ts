import { ConvexHttpClient } from "convex/browser";
import { importPKCS8, SignJWT } from "jose";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { api } from "./convex/_generated/api";

declare module "next-auth" {
  interface Session {
    // JWT firmado por esta app (RS256) que Convex verifica criptográficamente
    // (ver convex/auth.config.ts + convex/http.ts). No confundir con la
    // sesión/cookie propia de Auth.js — este token solo lleva el email.
    convexToken?: string;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function mintConvexToken(email: string): Promise<string> {
  const pem = (process.env.CONVEX_AUTH_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(pem, "RS256");
  const issuer = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;
  const now = Math.floor(Date.now() / 1000);
  const normalized = normalizeEmail(email);

  // Se consulta en cada minteo (no se cachea) para que un reset de
  // contraseña invalide tokens ya emitidos casi de inmediato — ver el
  // chequeo de `pwAt` en convex/mockSession.ts. Si esta consulta falla por
  // cualquier motivo, no se debe emitir un token que un check de staleness
  // no pueda verificar correctamente después: se deja fallar el signIn.
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const passwordChangedAt = await client.action(api.users.getPasswordChangedAt, {
    email: normalized,
    secret: process.env.PROVISION_CHECK_SECRET!,
  });

  return await new SignJWT({ email: normalized, pwAt: passwordChangedAt ?? 0 })
    .setProtectedHeader({ alg: "RS256", kid: process.env.CONVEX_AUTH_KEY_ID, typ: "JWT" })
    .setIssuedAt(now)
    .setIssuer(issuer)
    .setAudience("convex")
    .setSubject(normalized)
    .setExpirationTime(now + 60 * 60)
    .sign(privateKey);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const user = await client.action(api.authActions.login, { email, password });
        if (!user) return null;

        return { id: user.id, name: user.nombre, email: user.email };
      },
    }),
  ],
  callbacks: {
    // Gate de aprovisionamiento: solo aplica a Google — Credentials ya
    // valida contra la tabla `users` dentro de `authorize` (arriba).
    // Registro cerrado por diseño: un email de Google sin fila
    // correspondiente en `users` se rechaza aquí, sin crear nada.
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email) return false;
      // Estricto a propósito: rechaza también `undefined`, no solo `false`
      // explícito (MCP-78) — Google siempre debería mandar un booleano real
      // aquí, así que cualquier otra cosa se trata como no verificado.
      if (profile.email_verified !== true) return false;

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      return await client.action(api.users.checkProvisioned, {
        email: profile.email,
        secret: process.env.PROVISION_CHECK_SECRET!,
      });
    },
    // Adjunta un JWT firmado por esta app (no la sesión de Auth.js en sí)
    // que Convex puede verificar de forma independiente. Solo necesita el
    // email — Convex resuelve nombre/rol/permisos consultando su propia
    // tabla `users` por ese email en cada request (ver
    // convex/mockSession.ts), nunca confía en nada más que venga del cliente.
    async session({ session, token }) {
      const email = token.email ?? session.user?.email;
      if (email) {
        session.convexToken = await mintConvexToken(email);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
