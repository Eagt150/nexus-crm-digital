"use client";

import type { ReactNode } from "react";
import { ClientePicker } from "@/components/clientes/ClientePicker";
import type { Id } from "../../../convex/_generated/dataModel";

interface ClientPickerFlowProps {
  cliente: { id: Id<"contacts">; nombre: string } | null;
  onPick: (id: Id<"contacts">, nombre: string) => void;
  onChangeCliente: () => void;
  renderForm: (clienteId: Id<"contacts">) => ReactNode;
}

// Shell compartido por los overlays que se abren sin cliente fijado (p. ej.
// "Anotar interacción"/"Nueva tarea" en Hoy, "Registrar venta" en Hoy y en
// Ventas): primero el picker, y una vez elegido el cliente, el encabezado
// "Cliente: X Cambiar" + el formulario que corresponda.
export function ClientPickerFlow({ cliente, onPick, onChangeCliente, renderForm }: ClientPickerFlowProps) {
  if (cliente === null) return <ClientePicker onSelect={onPick} />;
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Cliente: <span className="font-medium text-text">{cliente.nombre}</span>{" "}
        <button type="button" className="text-primary hover:underline" onClick={onChangeCliente}>
          Cambiar
        </button>
      </p>
      {renderForm(cliente.id)}
    </>
  );
}
