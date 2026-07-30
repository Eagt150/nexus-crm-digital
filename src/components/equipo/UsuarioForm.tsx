"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { Input } from "@/components/ui/Input";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RolUsuario = "propietaria" | "comercial";

const ROL_OPTIONS: { value: RolUsuario; label: string }[] = [
  { value: "propietaria", label: "Dueña" },
  { value: "comercial", label: "Atiende y vende" },
];

export interface UsuarioEditData {
  id: Id<"users">;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

type UsuarioFormProps = {
  // Emails de otros usuarios activos (excluyendo, en modo edit, al propio
  // usuario) — permite avisar de un email duplicado al instante, sin
  // depender de que el mensaje de error del servidor llegue al cliente
  // (Convex lo sanea por defecto salvo que se use ConvexError, que este
  // proyecto no usa en ningún otro sitio).
  otherEmails: string[];
  // Solo en modo edit: si este usuario es la única propietaria activa, no
  // se puede degradar su rol — se bloquea aquí mismo, no solo al eliminar.
  lockRolePropietaria?: boolean;
} & (
  | { mode: "create"; onSaved: () => void; onCancel: () => void }
  | { mode: "edit"; usuario: UsuarioEditData; onSaved: () => void; onCancel: () => void }
);

// Formulario compartido de alta/edición de usuario (MCP-72). No conoce
// Overlay ni useToast — el llamador decide qué hacer tras guardar, igual
// que ClienteForm.
export function UsuarioForm(props: UsuarioFormProps) {
  const initial = props.mode === "edit" ? props.usuario : undefined;

  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [rol, setRol] = useState<RolUsuario | null>(initial?.rol ?? null);

  const [triedSave, setTriedSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createUser = useMutation(api.users.createUser);
  const updateUser = useMutation(api.users.updateUser);

  const normalizedEmail = email.trim().toLowerCase();
  const nombreValid = nombre.trim().length > 0;
  const emailFormatValid = EMAIL_RE.test(normalizedEmail);
  const emailTaken = emailFormatValid && props.otherEmails.includes(normalizedEmail);
  const emailValid = emailFormatValid && !emailTaken;
  const formValid = nombreValid && emailValid && rol !== null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSave(true);
    setMutationError(null);
    if (!formValid || rol === null) return;

    setSubmitting(true);
    try {
      const shared = { nombre: nombre.trim(), email: normalizedEmail, rol };
      if (props.mode === "create") {
        await createUser(shared);
      } else {
        await updateUser({ userId: props.usuario.id, ...shared });
      }
      props.onSaved();
    } catch {
      setMutationError("No se pudo guardar el usuario. Inténtalo de nuevo.");
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
        placeholder="Carlos Ruiz"
        value={nombre}
        onChange={(event) => setNombre(event.target.value)}
        error={triedSave && !nombreValid ? "Añade un nombre" : undefined}
      />

      <Input
        label="Email"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        placeholder="nombre@empresa.es"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={
          triedSave && !emailFormatValid
            ? "Introduce un email válido"
            : triedSave && emailTaken
              ? "Ya hay otro usuario con ese email"
              : undefined
        }
      />

      <ChipGroup
        label="Rol"
        options={props.lockRolePropietaria ? ROL_OPTIONS.slice(0, 1) : ROL_OPTIONS}
        value={rol}
        onChange={(value) => setRol(value as RolUsuario | null)}
        error={triedSave && rol === null ? "Elige un rol" : undefined}
        helper={
          props.lockRolePropietaria
            ? "Debe quedar al menos una propietaria activa en el equipo."
            : undefined
        }
      />

      <div className="mt-2 flex gap-3">
        <Button type="button" variant="secondary" className="flex-none" onClick={props.onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={submitting} className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  );
}
