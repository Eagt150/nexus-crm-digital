"use client";

import { useMutation } from "convex/react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { hasSession, saveSession } from "@/lib/session";
import { api } from "../../../convex/_generated/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const login = useMutation(api.users.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showForgotHint, setShowForgotHint] = useState(false);

  useEffect(() => {
    if (hasSession()) router.replace("/hoy");
  }, [router]);

  const emailValid = EMAIL_RE.test(email);
  const passwordValid = password.length > 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    setAuthError(null);
    if (!emailValid || !passwordValid) return;

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      if (!user) {
        setAuthError("Email o contraseña incorrectos.");
        return;
      }
      saveSession(user);
      router.replace("/hoy");
    } catch {
      setAuthError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <div className="flex items-center justify-center gap-2">
          <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-primary text-base font-semibold text-on-primary">
            V
          </span>
          <span className="text-base font-semibold tracking-tight text-text">Vibe CRM</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <h1 className="text-2xl font-semibold tracking-tight text-text">Inicia sesión</h1>
          <p className="mt-1 text-sm text-muted">Entra con tu cuenta para gestionar tus clientes.</p>

          {authError && (
            <div role="alert" className="mt-4 rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">
              {authError}
            </div>
          )}

          <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={triedSubmit && !emailValid ? "Introduce un email válido." : undefined}
            />

            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={triedSubmit && !passwordValid ? "Introduce tu contraseña." : undefined}
                  className="pr-11"
                />
                <IconButton
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-1 top-[26px]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </IconButton>
              </div>
            </div>

            <Button type="submit" variant="primary" loading={submitting} className="w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowForgotHint(true)}
              className="text-sm text-muted underline underline-offset-2 hover:text-text"
            >
              ¿Olvidaste tu contraseña?
            </button>
            {showForgotHint && (
              <p className="mt-2 text-sm text-muted">
                Pide a tu administradora que la restablezca por ti.
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-subtle">
          Demo local — marta@vibecrm.dev / vibecrm2024
        </p>
      </div>
    </div>
  );
}
