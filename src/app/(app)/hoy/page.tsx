"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Overlay } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { ClientePicker } from "@/components/clientes/ClientePicker";
import { InteraccionForm } from "@/components/interacciones/InteraccionForm";
import { SeguimientoForm } from "@/components/seguimientos/SeguimientoForm";
import { FollowUpRow } from "@/components/hoy/FollowUpRow";
import { FollowUpSection } from "@/components/hoy/FollowUpSection";
import { PlaceholderFormNotice } from "@/components/hoy/PlaceholderFormNotice";
import { QuickActionsGrid, type QuickAction } from "@/components/hoy/QuickActionsGrid";
import { useToast } from "@/components/toast/ToastProvider";
import { todayEyebrow, todayISO } from "@/lib/date";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// Shell compartido por los overlays que se abren desde Hoy sin cliente
// fijado ("interaccion", "tarea"): primero el picker, y una vez elegido el
// cliente, el encabezado "Cliente: X Cambiar" + el formulario que corresponda.
function renderClientPickerFlow(
  cliente: { id: Id<"contacts">; nombre: string } | null,
  onPick: (id: Id<"contacts">, nombre: string) => void,
  onChangeCliente: () => void,
  renderForm: (clienteId: Id<"contacts">) => ReactNode
) {
  if (cliente === null) return <ClientePicker onSelect={onPick} />;
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Cliente: <span className="font-medium text-text">{cliente.nombre}</span>{" "}
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={onChangeCliente}
        >
          Cambiar
        </button>
      </p>
      {renderForm(cliente.id)}
    </>
  );
}

const OVERLAY_META: Record<QuickAction, { title: string; ticket: string }> = {
  tarea: { title: "Nueva tarea", ticket: "P-09" }, // TODO(P-09): reemplazar por el formulario real
  interaccion: { title: "Anotar interacción", ticket: "P-06" }, // TODO(P-06): reemplazar por el formulario real
  venta: { title: "Registrar venta", ticket: "P-10" }, // TODO(P-10): reemplazar por el formulario real
  cliente: { title: "Nuevo cliente", ticket: "P-05" }, // TODO(P-05): reemplazar por el formulario real
};

export default function HoyPage() {
  const router = useRouter();
  const [localTodayISO] = useState(() => todayISO());
  const [activeOverlay, setActiveOverlay] = useState<QuickAction | null>(null);
  const [interaccionCliente, setInteraccionCliente] = useState<{
    id: Id<"contacts">;
    nombre: string;
  } | null>(null);
  const [tareaCliente, setTareaCliente] = useState<{
    id: Id<"contacts">;
    nombre: string;
  } | null>(null);
  const { showToast } = useToast();

  function handleClienteSaved(id: Id<"contacts">) {
    setActiveOverlay(null);
    showToast("Cliente añadido");
    router.push(`/clientes/${id}`);
  }

  function handleCloseInteraccion() {
    setActiveOverlay(null);
    setInteraccionCliente(null);
  }

  function handleInteraccionSaved() {
    handleCloseInteraccion();
    showToast("Interacción registrada");
  }

  function handleCloseTarea() {
    setActiveOverlay(null);
    setTareaCliente(null);
  }

  function handleTareaSaved() {
    handleCloseTarea();
    showToast("Seguimiento programado");
  }

  const data = useQuery(api.seguimientos.listPending, { localTodayISO });
  const markDone = useMutation(api.seguimientos.markDone).withOptimisticUpdate(
    (store, args) => {
      const current = store.getQuery(api.seguimientos.listPending, { localTodayISO });
      if (current !== undefined) {
        store.setQuery(
          api.seguimientos.listPending,
          { localTodayISO },
          current.filter((row) => row.id !== args.id)
        );
      }
    }
  );
  const undoDone = useMutation(api.seguimientos.undoDone);

  function handleDone(id: Id<"seguimientos">) {
    markDone({ id });
    showToast("Seguimiento completado", {
      actionLabel: "Deshacer",
      onAction: () => undoDone({ id }),
      durationMs: 3800,
    });
  }

  const atrasados = data?.filter((row) => row.urgency === "atrasado") ?? [];
  const paraHoy = data?.filter((row) => row.urgency === "hoy") ?? [];
  const total = data?.length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 py-7 md:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-caps text-subtle">
          {todayEyebrow()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {data === undefined
            ? "Cargando…"
            : total === 0
              ? "Todo al día"
              : `${total} seguimiento${total === 1 ? "" : "s"} pendiente${total === 1 ? "" : "s"}`}
        </h1>
      </header>

      <QuickActionsGrid onAction={setActiveOverlay} />

      {data === undefined && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {data !== undefined && total === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="No hay seguimientos para hoy"
          helper="Estás al día con tus clientes."
          action={
            <Button variant="primary" onClick={() => setActiveOverlay("tarea")}>
              Nueva tarea
            </Button>
          }
        />
      )}

      {atrasados.length > 0 && (
        <FollowUpSection label="Atrasados" tone="error" count={atrasados.length}>
          {atrasados.map((row) => (
            <FollowUpRow
              key={row.id}
              id={row.id}
              clienteId={row.cliente.id}
              clienteNombre={row.cliente.nombre}
              clienteEstado={row.cliente.estado}
              accion={row.accion}
              responsableNombre={row.responsable.nombre}
              urgency={row.urgency}
              vence={row.vence}
              todayISOValue={localTodayISO}
              onDone={handleDone}
            />
          ))}
        </FollowUpSection>
      )}

      {paraHoy.length > 0 && (
        <FollowUpSection label="Para hoy" tone="neutral" count={paraHoy.length}>
          {paraHoy.map((row) => (
            <FollowUpRow
              key={row.id}
              id={row.id}
              clienteId={row.cliente.id}
              clienteNombre={row.cliente.nombre}
              clienteEstado={row.cliente.estado}
              accion={row.accion}
              responsableNombre={row.responsable.nombre}
              urgency={row.urgency}
              vence={row.vence}
              todayISOValue={localTodayISO}
              onDone={handleDone}
            />
          ))}
        </FollowUpSection>
      )}

      <Overlay
        open={activeOverlay !== null}
        onClose={
          activeOverlay === "interaccion"
            ? handleCloseInteraccion
            : activeOverlay === "tarea"
              ? handleCloseTarea
              : () => setActiveOverlay(null)
        }
        title={activeOverlay ? OVERLAY_META[activeOverlay].title : ""}
      >
        {activeOverlay === "cliente" ? (
          <ClienteForm
            mode="create"
            onSaved={handleClienteSaved}
            onCancel={() => setActiveOverlay(null)}
          />
        ) : activeOverlay === "interaccion" ? (
          renderClientPickerFlow(
            interaccionCliente,
            (id, nombre) => setInteraccionCliente({ id, nombre }),
            () => setInteraccionCliente(null),
            (clienteId) => (
              <InteraccionForm
                clienteId={clienteId}
                onSaved={handleInteraccionSaved}
                onCancel={handleCloseInteraccion}
              />
            )
          )
        ) : activeOverlay === "tarea" ? (
          renderClientPickerFlow(
            tareaCliente,
            (id, nombre) => setTareaCliente({ id, nombre }),
            () => setTareaCliente(null),
            (clienteId) => (
              <SeguimientoForm
                clienteId={clienteId}
                onSaved={handleTareaSaved}
                onCancel={handleCloseTarea}
              />
            )
          )
        ) : (
          activeOverlay && (
            <PlaceholderFormNotice
              label={OVERLAY_META[activeOverlay].title}
              ticket={OVERLAY_META[activeOverlay].ticket}
              onClose={() => setActiveOverlay(null)}
            />
          )
        )}
      </Overlay>
    </div>
  );
}
