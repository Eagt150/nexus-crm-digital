"use client";

import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { Input } from "@/components/ui/Input";
import { useCurrentUser } from "@/lib/session";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface SeguimientoFormProps {
  clienteId: Id<"contacts">;
  onSaved: () => void;
  onCancel: () => void;
}

// Overlay "Programar seguimiento" (P-08/MCP-74), siempre abierto desde una
// ficha con el cliente ya fijado. El responsable por defecto es el usuario
// en sesión (vía useCurrentUser, no readSession — ver plan de MCP-32), pero
// reasignable a cualquier miembro del equipo.
export function SeguimientoForm({ clienteId, onSaved, onCancel }: SeguimientoFormProps) {
  const currentUser = useCurrentUser();
  const teamMembers = useQuery(api.users.listTeamMembers, {});

  const [accion, setAccion] = useState("");
  const [fecha, setFecha] = useState("");
  const [responsableId, setResponsableId] = useState<Id<"users"> | null>(null);

  const [triedSave, setTriedSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createSeguimiento = useMutation(api.seguimientos.create);

  const effectiveResponsableId = responsableId ?? currentUser?.id ?? null;
  const accionValid = accion.trim().length > 0;
  const fechaValid = fecha.trim().length > 0;
  const formValid = accionValid && fechaValid && effectiveResponsableId !== null;

  const responsableOptions =
    teamMembers?.map((member) => ({ value: member.id, label: member.nombre })) ?? [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSave(true);
    setMutationError(null);
    if (!formValid || !effectiveResponsableId) return;

    setSubmitting(true);
    try {
      await createSeguimiento({
        clienteId,
        accion: accion.trim(),
        vence: fecha,
        responsableId: effectiveResponsableId,
      });
      onSaved();
    } catch {
      setMutationError("No se pudo guardar el seguimiento. Inténtalo de nuevo.");
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
        label="Qué hay que hacer"
        autoFocus
        placeholder="Llamar para confirmar el pedido"
        value={accion}
        onChange={(event) => setAccion(event.target.value)}
        error={triedSave && !accionValid ? "Añade una acción" : undefined}
      />

      <Input
        label="Fecha"
        type="date"
        value={fecha}
        onChange={(event) => setFecha(event.target.value)}
        error={triedSave && !fechaValid ? "Elige una fecha" : undefined}
      />

      <ChipGroup
        label="Responsable"
        options={responsableOptions}
        value={effectiveResponsableId}
        onChange={(value) => setResponsableId(value as Id<"users"> | null)}
        error={triedSave && !effectiveResponsableId ? "Elige un responsable" : undefined}
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
