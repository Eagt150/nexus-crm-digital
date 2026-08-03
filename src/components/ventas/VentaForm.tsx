"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { Input } from "@/components/ui/Input";
import { todayISO } from "@/lib/date";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type EstadoVenta = "oportunidad" | "ganada" | "perdida";

const ESTADO_OPTIONS: { value: EstadoVenta; label: string }[] = [
  { value: "oportunidad", label: "Oportunidad abierta" },
  { value: "ganada", label: "Ganada" },
  { value: "perdida", label: "Perdida" },
];

export interface VentaEditData {
  id: Id<"ventas">;
  concepto: string;
  importe: number;
  estado: EstadoVenta;
  fecha: string;
}

type VentaFormProps =
  | { mode: "create"; clienteId: Id<"contacts">; onSaved: () => void; onCancel: () => void }
  | { mode: "edit"; venta: VentaEditData; onSaved: () => void; onCancel: () => void };

// Overlay "Registrar venta" / "Editar venta" (P-10/MCP-37, edición añadida
// después). `clienteId` (modo create) siempre llega ya resuelto: desde la
// ficha viene fijado por la ruta, y desde Hoy/Ventas lo resuelve antes
// ClientPickerFlow. `estado` usa ChipGroup con un valor inicial
// ("oportunidad" en alta, el valor guardado en edición) — como ChipGroup
// permite deseleccionar con reclick, un `null` accidental se trata como
// inválido en la validación de submit (igual que el email en ClienteForm),
// en vez de modificar el componente.
export function VentaForm(props: VentaFormProps) {
  const initial = props.mode === "edit" ? props.venta : undefined;

  const [concepto, setConcepto] = useState(initial?.concepto ?? "");
  const [importe, setImporte] = useState(initial ? String(initial.importe) : "");
  const [estado, setEstado] = useState<EstadoVenta | null>(initial?.estado ?? "oportunidad");
  const [fecha, setFecha] = useState(() => initial?.fecha ?? todayISO());

  const [triedSave, setTriedSave] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createVenta = useMutation(api.ventas.create);
  const updateVenta = useMutation(api.ventas.update);

  const conceptoValid = concepto.trim().length > 0;
  const importeNumber = Number(importe);
  const importeValid = importe.trim().length > 0 && Number.isFinite(importeNumber) && importeNumber > 0;
  const estadoValid = estado !== null;
  const formValid = conceptoValid && importeValid && estadoValid;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSave(true);
    setMutationError(null);
    if (!formValid || !estado) return;

    setSubmitting(true);
    try {
      if (props.mode === "create") {
        await createVenta({
          clienteId: props.clienteId,
          concepto: concepto.trim(),
          importe: importeNumber,
          estado,
          fecha,
        });
      } else {
        await updateVenta({
          id: props.venta.id,
          concepto: concepto.trim(),
          importe: importeNumber,
          estado,
          fecha,
        });
      }
      props.onSaved();
    } catch {
      setMutationError("No se pudo guardar la venta. Inténtalo de nuevo.");
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
        label="Qué se vende"
        autoFocus
        placeholder="Plan mensual"
        value={concepto}
        onChange={(event) => setConcepto(event.target.value)}
        error={triedSave && !conceptoValid ? "Añade un concepto" : undefined}
      />

      <Input
        label="Importe (€)"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0,00"
        value={importe}
        onChange={(event) => setImporte(event.target.value)}
        error={triedSave && !importeValid ? "Introduce un importe mayor que 0" : undefined}
      />

      <ChipGroup
        label="Estado"
        options={ESTADO_OPTIONS}
        value={estado}
        onChange={(value) => setEstado(value as EstadoVenta | null)}
        error={triedSave && !estadoValid ? "Elige un estado" : undefined}
      />

      <Input
        label="Fecha"
        type="date"
        value={fecha}
        onChange={(event) => setFecha(event.target.value)}
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
