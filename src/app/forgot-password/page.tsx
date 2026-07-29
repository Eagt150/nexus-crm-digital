"use client";

import { useAction } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { cn } from "@/lib/utils";
import { setResetEmail } from "@/lib/resetEmail";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "../../../convex/_generated/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type ResetMethod = "link" | "code";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const requestReset = useAction(api.passwordReset.requestReset);

  const [method, setMethod] = useState<ResetMethod>("link");
  const [email, setEmail] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"sent" | "not-found" | null>(null);

  const emailValid = EMAIL_RE.test(email);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    if (!emailValid) return;

    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const found = await requestReset({ email: trimmedEmail, method });
      if (found && method === "code") {
        setResetEmail(trimmedEmail);
        router.push("/reset-password?mode=code");
        return;
      }
      setResult(found ? "sent" : "not-found");
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
          {result === "sent" ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-text">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-muted">
                Te enviamos un enlace a <strong>{email.trim()}</strong> para restablecer tu
                contraseña. Caduca en 1 hora.
              </p>
            </>
          ) : result === "not-found" ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-text">
                Email no registrado
              </h1>
              <p className="mt-2 text-sm text-error-text">
                <strong>{email.trim()}</strong> no tiene una cuenta en Vibe CRM.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => setResult(null)}
              >
                Probar con otro email
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-text">
                Recupera tu contraseña
              </h1>
              <p className="mt-1 text-sm text-muted">
                Elige cómo quieres recuperarla y te enviamos lo necesario a tu email.
              </p>

              <div
                role="radiogroup"
                aria-label="Método de recuperación"
                className="mt-4 flex rounded-md border border-border-strong bg-surface-2 p-1"
              >
                {(
                  [
                    { value: "link", label: "Enlace" },
                    { value: "code", label: "Código" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={method === option.value}
                    onClick={() => setMethod(option.value)}
                    className={cn(
                      "flex-1 rounded-[5px] px-3 py-1.5 text-sm font-medium tracking-tight transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
                      method === option.value
                        ? "bg-surface text-text shadow-xs"
                        : "text-muted hover:text-text"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">
                {method === "link"
                  ? "Te enviamos un enlace: ábrelo y elige tu nueva contraseña ahí mismo."
                  : "Te enviamos un código de 6 dígitos: lo introduces aquí junto a tu email y tu nueva contraseña."}
              </p>

              <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={triedSubmit && !emailValid ? "Introduce un email válido." : undefined}
                />

                <Button type="submit" variant="primary" loading={submitting} className="w-full">
                  {method === "link" ? "Enviar enlace" : "Enviar código"}
                </Button>
              </form>
            </>
          )}

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-sm text-muted underline underline-offset-2 hover:text-text"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
