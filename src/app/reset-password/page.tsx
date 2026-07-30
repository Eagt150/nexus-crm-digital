"use client";

import { useAction } from "convex/react";
import { Eye, EyeOff, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { clearResetEmail, useResetEmail } from "@/lib/resetEmail";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { api } from "../../../convex/_generated/api";

type Outcome = "ok" | "invalid" | "expired";
const RESEND_SECONDS = 45;
const GENERIC_ERROR = "No se pudo completar. Inténtalo de nuevo.";

function GoogleHint() {
  return (
    <div className="mt-4 flex gap-2 rounded-md bg-surface-2 p-3 text-sm text-muted">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        Si tu cuenta usa contraseña, en unos minutos te llega el enlace o el código. ¿Entras con
        Google? Entonces no tienes contraseña que restablecer — vuelve a{" "}
        <Link href="/login" className="underline underline-offset-2">
          iniciar sesión
        </Link>{" "}
        y usa el botón de Google.
      </p>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        label="Contraseña nueva"
        type={show ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        helper={error ? undefined : "Mínimo 8 caracteres"}
        className="pr-11"
      />
      <IconButton
        type="button"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={show}
        onClick={() => setShow((current) => !current)}
        className="absolute right-1 top-[26px]"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </IconButton>
    </div>
  );
}

function OutcomeMessage({ outcome, router }: { outcome: Outcome; router: ReturnType<typeof useRouter> }) {
  useEffect(() => {
    if (outcome !== "ok") return;
    const timer = setTimeout(() => router.replace("/login"), 1500);
    return () => clearTimeout(timer);
  }, [outcome, router]);

  if (outcome === "ok") {
    return <p className="text-sm text-muted">Contraseña actualizada. Redirigiendo al login…</p>;
  }
  return (
    <p className="text-sm text-error-text">
      {outcome === "expired"
        ? "Esto ha caducado."
        : "Esto ya no es válido (puede que ya se haya usado, o el código esté agotado)."}{" "}
      Pide un enlace/código nuevo desde{" "}
      <Link href="/forgot-password" className="underline underline-offset-2">
        recuperar contraseña
      </Link>
      .
    </p>
  );
}

function TokenForm({ token }: { token: string }) {
  const router = useRouter();
  const confirmReset = useAction(api.passwordResetActions.confirmReset);

  const [password, setPassword] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const passwordValid = password.length >= 8;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    if (!passwordValid) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      setOutcome(await confirmReset({ token, newPassword: password }));
    } catch {
      setSubmitError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  if (outcome) return <OutcomeMessage outcome={outcome} router={router} />;

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <p role="alert" className="text-sm text-error-text">
          {submitError}
        </p>
      )}
      <PasswordField
        value={password}
        onChange={setPassword}
        error={triedSubmit && !passwordValid ? "Mínimo 8 caracteres." : undefined}
      />
      <Button type="submit" variant="primary" loading={submitting} className="w-full">
        Guardar nueva contraseña
      </Button>
    </form>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CodeForm() {
  const router = useRouter();
  const confirmResetWithCode = useAction(api.passwordResetActions.confirmResetWithCode);
  const requestReset = useAction(api.passwordReset.requestReset);

  const storedEmail = useResetEmail();
  const emailLocked = storedEmail !== null;
  const [manualEmail, setManualEmail] = useState("");
  const email = emailLocked ? storedEmail : manualEmail;

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const emailValid = EMAIL_RE.test(email);
  const codeValid = /^\d{6}$/.test(code);
  const passwordValid = password.length >= 8;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    if (!emailValid || !codeValid || !passwordValid) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      setOutcome(
        await confirmResetWithCode({ email: email.trim(), code, newPassword: password })
      );
    } catch {
      setSubmitError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!emailValid || secondsLeft > 0) return;
    setResending(true);
    setResendNote(null);
    try {
      const result = await requestReset({ email: email.trim(), method: "code" });
      if (result === "sent") {
        setSecondsLeft(RESEND_SECONDS);
      } else if (result === "rate-limited") {
        setResendNote("Espera unos segundos más antes de pedir otro.");
      } else {
        setResendNote(GENERIC_ERROR);
      }
    } catch {
      setResendNote(GENERIC_ERROR);
    } finally {
      setResending(false);
    }
  }

  if (outcome) return <OutcomeMessage outcome={outcome} router={router} />;

  return (
    <>
      {emailLocked ? (
        <p className="text-sm text-muted">
          Lo hemos mandado a <strong>{email}</strong>.{" "}
          <button
            type="button"
            onClick={clearResetEmail}
            className="underline underline-offset-2 hover:text-text"
          >
            Cambiar correo
          </button>
        </p>
      ) : null}

      <GoogleHint />

      <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <p role="alert" className="text-sm text-error-text">
            {submitError}
          </p>
        )}
        {!emailLocked && (
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setManualEmail(event.target.value)}
            error={triedSubmit && !emailValid ? "Introduce un email válido." : undefined}
          />
        )}
        <Input
          label="Código"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={emailLocked}
          placeholder="000000"
          className="text-center text-lg tracking-[0.5em]"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          error={triedSubmit && !codeValid ? "El código tiene 6 dígitos." : undefined}
        />
        <PasswordField
          value={password}
          onChange={setPassword}
          error={triedSubmit && !passwordValid ? "Mínimo 8 caracteres." : undefined}
        />
        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Cambiar contraseña
        </Button>
      </form>

      <div className="mt-3 text-center text-sm text-muted">
        {secondsLeft > 0 ? (
          <span>Reenviar código en {secondsLeft}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={!emailValid || resending}
            className="underline underline-offset-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reenviar código
          </button>
        )}
        {resendNote && <p className="mt-1 text-error-text">{resendNote}</p>}
      </div>
    </>
  );
}

function ResetPasswordBody() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [mode, setMode] = useState<"token" | "code">(token ? "token" : "code");

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-text">
        {mode === "token" ? "Elige tu nueva contraseña" : "Escribe el código"}
      </h1>

      <div className="mt-1">
        {mode === "token" && token ? (
          <>
            <TokenForm token={token} />
            <GoogleHint />
          </>
        ) : mode === "token" ? (
          <p className="text-sm text-error-text">
            Este enlace no es válido. Pide uno nuevo desde{" "}
            <Link href="/forgot-password" className="underline underline-offset-2">
              recuperar contraseña
            </Link>
            .
          </p>
        ) : (
          <CodeForm />
        )}
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setMode(mode === "token" ? "code" : "token")}
          className="text-sm text-muted underline underline-offset-2 hover:text-text"
        >
          {mode === "token" ? "Prefiero usar el código que me enviaron" : "Tengo el enlace del correo"}
        </button>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={null}>
            <ResetPasswordBody />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
