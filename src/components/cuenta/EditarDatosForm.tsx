"use client";

import { useMutation } from "convex/react";
import { signOut } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "../../../convex/_generated/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EditarDatosFormProps {
  nombre: string;
  email: string;
  tienePassword: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

// Autoservicio de "Editar mis datos" (MCP-73) — a diferencia de
// UsuarioForm.tsx (admin editando a otros desde /equipo), no toca `rol` ni
// tiene una lista de `otherEmails` para pre-chequear duplicados (un usuario
// `comercial` no puede consultar esa lista). El servidor
// (users.ts#updateMyProfile) es la última palabra en email duplicado y en
// el bloqueo de email para cuentas solo-Google.
export function EditarDatosForm({
  nombre: initialNombre,
  email: initialEmail,
  tienePassword,
  onSaved,
  onCancel,
}: EditarDatosFormProps) {
  const [nombre, setNombre] = useState(initialNombre);
  const [email, setEmail] = useState(initialEmail);
  const [triedSave, setTriedSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const updateMyProfile = useMutation(api.users.updateMyProfile);

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedInitialEmail = initialEmail.trim().toLowerCase();
  const nombreValid = nombre.trim().length > 0;
  const emailValid = EMAIL_RE.test(normalizedEmail);
  const formValid = nombreValid && emailValid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSave(true);
    setMutationError(null);
    if (!formValid) return;

    setSubmitting(true);
    try {
      await updateMyProfile({ nombre: nombre.trim(), email: normalizedEmail });
      if (normalizedEmail !== normalizedInitialEmail) {
        // El JWT de la sesión actual sigue llevando el email viejo — Convex
        // ya no encontrará esta fila por ese email (ver
        // mockSession.ts#getCurrentUserOrNull), así que en vez de dejar al
        // usuario en una sesión a medio romper, se cierra de una vez y
        // vuelve a entrar con el email nuevo.
        await signOut({ callbackUrl: "/login" });
        return;
      }
      onSaved();
    } catch {
      setMutationError("No se pudo guardar. Comprueba que el email no esté en uso e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {mutationError && (
        <div role="alert" className="rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">
          {mutationError}
        </div>
      )}

      <Input
        label="Nombre"
        autoFocus
        autoCapitalize="words"
        value={nombre}
        onChange={(event) => setNombre(event.target.value)}
        error={triedSave && !nombreValid ? "Añade un nombre" : undefined}
      />

      <Input
        label="Email"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        disabled={!tienePassword}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={triedSave && !emailValid ? "Introduce un email válido" : undefined}
        helper={
          !tienePassword ? "Entras con Google — el email de tu cuenta no se puede cambiar aquí." : undefined
        }
      />

      <div className="mt-2 flex gap-3">
        <Button type="button" variant="secondary" className="flex-none" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={submitting} className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  );
}
