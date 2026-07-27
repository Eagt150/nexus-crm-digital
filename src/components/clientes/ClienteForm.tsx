"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CanalOrigen = "web" | "redes" | "email" | "whatsapp";
export type EstadoCliente = "activo" | "seguimiento" | "inactivo";

const CANAL_OPTIONS: { value: CanalOrigen; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "redes", label: "Redes" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

const ESTADO_OPTIONS: { value: EstadoCliente; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "seguimiento", label: "En seguimiento" },
  { value: "inactivo", label: "Inactivo" },
];

export interface ClienteEditData {
  id: Id<"contacts">;
  nombre: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  canalOrigen?: CanalOrigen;
  nota?: string;
  estado?: EstadoCliente;
}

type ClienteFormProps =
  | { mode: "create"; onSaved: (id: Id<"contacts">) => void; onCancel: () => void }
  | { mode: "edit"; contact: ClienteEditData; onSaved: () => void; onCancel: () => void };

// Formulario compartido de alta/edición de cliente (F1). No conoce Overlay,
// useRouter ni useToast — el llamador decide qué hacer tras guardar
// (navegar, mostrar un toast, cerrar el overlay).
export function ClienteForm(props: ClienteFormProps) {
  const initial = props.mode === "edit" ? props.contact : undefined;

  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [empresa, setEmpresa] = useState(initial?.empresa ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [canal, setCanal] = useState<CanalOrigen | null>(initial?.canalOrigen ?? null);
  const [estado, setEstado] = useState<EstadoCliente | null>(initial?.estado ?? null);
  const [nota, setNota] = useState(initial?.nota ?? "");

  const [triedSave, setTriedSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createContact = useMutation(api.contacts.create);
  const updateContact = useMutation(api.contacts.update);

  const nombreValid = nombre.trim().length > 0;
  const emailValid = email.trim().length === 0 || EMAIL_RE.test(email.trim());
  const hasContactMethod = telefono.trim().length > 0 || email.trim().length > 0;
  const formValid = nombreValid && emailValid && hasContactMethod;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSave(true);
    setMutationError(null);
    if (!formValid) return;

    setSubmitting(true);
    try {
      const shared = {
        nombre: nombre.trim(),
        empresa: empresa.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        canalOrigen: canal ?? undefined,
        nota: nota.trim() || undefined,
      };

      if (props.mode === "create") {
        const id = await createContact(shared);
        props.onSaved(id);
      } else {
        await updateContact({ id: props.contact.id, ...shared, estado: estado ?? undefined });
        props.onSaved();
      }
    } catch {
      setMutationError("No se pudo guardar el cliente. Inténtalo de nuevo.");
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
        placeholder="Marta López"
        value={nombre}
        onChange={(event) => setNombre(event.target.value)}
        error={triedSave && !nombreValid ? "Añade un nombre" : undefined}
      />

      <Input
        label="Empresa"
        placeholder="Acme S.L."
        value={empresa}
        onChange={(event) => setEmpresa(event.target.value)}
      />

      <Input
        label="Teléfono"
        type="tel"
        inputMode="tel"
        placeholder="+34 600 000 000"
        value={telefono}
        onChange={(event) => setTelefono(event.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          placeholder="nombre@empresa.es"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={triedSave && !emailValid ? "Email no válido" : undefined}
        />
        <p className={triedSave && !hasContactMethod ? "text-sm text-error-text" : "text-sm text-muted"} role={triedSave && !hasContactMethod ? "alert" : undefined}>
          Indica al menos un teléfono o un email.
        </p>
      </div>

      <ChipGroup
        label="Canal de origen"
        options={CANAL_OPTIONS}
        value={canal}
        onChange={(value) => setCanal(value as CanalOrigen | null)}
      />

      {props.mode === "edit" && (
        <ChipGroup
          label="Estado"
          options={ESTADO_OPTIONS}
          value={estado}
          onChange={(value) => setEstado(value as EstadoCliente | null)}
        />
      )}

      <Textarea
        label="Nota"
        placeholder="Detalle del primer contacto, necesidades…"
        value={nota}
        onChange={(event) => setNota(event.target.value)}
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
