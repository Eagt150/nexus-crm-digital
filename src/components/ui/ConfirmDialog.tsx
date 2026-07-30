"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Overlay } from "./Overlay";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

// Diálogo de confirmación destructivo genérico — no existía nada parecido
// en el proyecto. Atrapa el rechazo de `onConfirm` para no dejar un
// Uncaught Promise Rejection si la mutation lanza (ej. una guarda del
// servidor se dispara por una condición de carrera): el caller sigue
// siendo responsable de mostrar el error (toast) dentro de su propio
// `onConfirm`, esto es solo una red de seguridad.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } catch {
      // Silenciado a propósito: el caller ya decide cómo comunicar el
      // error (ver equipo/page.tsx). Aquí solo evitamos la promesa
      // rechazada sin atrapar.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Overlay open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-4 flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          loading={submitting}
          className="flex-1"
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Overlay>
  );
}
