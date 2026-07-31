"use client";

import { useAction } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "../../../convex/_generated/api";

const MIN_PASSWORD_LENGTH = 8;

interface CambiarPasswordFormProps {
  onCancel: () => void;
}

// "Cambiar contraseña" (MCP-73). Solo se monta cuando el usuario actual
// tiene `tienePassword` (ver src/app/(app)/cuenta/page.tsx) — el guard
// "cuenta solo-Google" real vive en el servidor
// (accountActions.ts#changeMyPassword), esto es solo la primera capa.
export function CambiarPasswordForm({ onCancel }: CambiarPasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [triedSave, setTriedSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invalidCurrent, setInvalidCurrent] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const changeMyPassword = useAction(api.accountActions.changeMyPassword);

  const currentValid = currentPassword.length > 0;
  const newValid = newPassword.length >= MIN_PASSWORD_LENGTH;
  const repeatValid = repeatPassword === newPassword && newPassword.length > 0;
  const formValid = currentValid && newValid && repeatValid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSave(true);
    setMutationError(null);
    setInvalidCurrent(false);
    if (!formValid) return;

    setSubmitting(true);
    try {
      const result = await changeMyPassword({ currentPassword, newPassword });
      if (result === "ok") {
        // El token de Convex de la sesión ya abierta todavía lleva el
        // `pwAt` viejo. `useSession().update()` refresca la sesión de
        // Auth.js, pero ConvexClientProvider.tsx desacopla a propósito ese
        // refresco del ciclo de fetchAccessToken de Convex (ver sus
        // comentarios sobre `initialAuthTokenReuse`) para evitar un bucle
        // infinito ya documentado — así que `update()` no le llega a Convex
        // y las queries se quedarían devolviendo "no autenticado" hasta el
        // refresco natural (~1h). Confirmado en pruebas manuales: solo una
        // recarga completa reautentica de inmediato con el token nuevo.
        window.location.reload();
        return;
      }
      if (result === "invalid-current") {
        setInvalidCurrent(true);
        return;
      }
      // "weak-password"/"google-only": no deberían alcanzarse (ya
      // validados/ocultos en el cliente) — mensaje genérico si de todos
      // modos ocurren.
      setMutationError("No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    } catch {
      setMutationError("No se pudo cambiar la contraseña. Inténtalo de nuevo.");
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
        label="Contraseña actual"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        error={
          triedSave && !currentValid
            ? "Introduce tu contraseña actual"
            : invalidCurrent
              ? "La contraseña actual no es correcta"
              : undefined
        }
      />

      <Input
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        error={triedSave && !newValid ? `Debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` : undefined}
      />

      <Input
        label="Repetir nueva contraseña"
        type="password"
        autoComplete="new-password"
        value={repeatPassword}
        onChange={(event) => setRepeatPassword(event.target.value)}
        error={triedSave && !repeatValid ? "No coincide con la nueva contraseña" : undefined}
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
