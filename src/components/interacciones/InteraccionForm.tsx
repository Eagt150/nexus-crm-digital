"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useCurrentUser } from "@/lib/session";
import { todayISO } from "@/lib/date";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type TipoInteraccion = "llamada" | "email" | "whatsapp" | "en_persona";

const CANAL_OPTIONS: { value: TipoInteraccion; label: string }[] = [
  { value: "llamada", label: "Llamada" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "en_persona", label: "En persona" },
];

interface InteraccionFormProps {
  clienteId: Id<"contacts">;
  onSaved: () => void;
  onCancel: () => void;
}

// Overlay "Anotar interacción" (P-06/MCP-33), siempre abierto desde una
// ficha con el cliente ya fijado — no incluye selector de cliente (esa
// variante, para abrir desde Hoy, queda fuera de este plan). Sigue el mismo
// patrón que ClienteForm: no conoce Overlay/useToast, el caller decide.
export function InteraccionForm({ clienteId, onSaved, onCancel }: InteraccionFormProps) {
  const currentUser = useCurrentUser();

  const [canal, setCanal] = useState<TipoInteraccion | null>(null);
  const [fecha, setFecha] = useState(() => todayISO());
  const [nota, setNota] = useState("");

  const [triedSave, setTriedSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createInteraccion = useMutation(api.interacciones.create);

  const canalValid = canal !== null;
  const notaValid = nota.trim().length > 0;
  const formValid = canalValid && notaValid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSave(true);
    setMutationError(null);
    if (!formValid || !canal) return;

    setSubmitting(true);
    try {
      await createInteraccion({ clienteId, tipo: canal, texto: nota.trim(), fecha });
      onSaved();
    } catch {
      setMutationError("No se pudo guardar la interacción. Inténtalo de nuevo.");
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

      <ChipGroup
        label="Canal"
        options={CANAL_OPTIONS}
        value={canal}
        onChange={(value) => setCanal(value as TipoInteraccion | null)}
        error={triedSave && !canalValid ? "Elige un canal" : undefined}
      />

      <Input
        label="Fecha"
        type="date"
        value={fecha}
        onChange={(event) => setFecha(event.target.value)}
      />

      <Textarea
        label="Nota"
        autoFocus
        placeholder="Qué se habló, próximos pasos…"
        value={nota}
        onChange={(event) => setNota(event.target.value)}
        error={triedSave && !notaValid ? "Añade una nota" : undefined}
      />

      {currentUser && <p className="text-sm text-muted">Se registrará como {currentUser.nombre}</p>}

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
