"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Overlay } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { ClientPickerFlow } from "@/components/clientes/ClientPickerFlow";
import { InteraccionForm } from "@/components/interacciones/InteraccionForm";
import { SeguimientoForm } from "@/components/seguimientos/SeguimientoForm";
import { VentaForm } from "@/components/ventas/VentaForm";
import { FollowUpRow } from "@/components/hoy/FollowUpRow";
import { FollowUpSection } from "@/components/hoy/FollowUpSection";
import { QuickActionsGrid, type QuickAction } from "@/components/hoy/QuickActionsGrid";
import { useToast } from "@/components/toast/ToastProvider";
import { todayEyebrow, todayISO } from "@/lib/date";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const OVERLAY_META: Record<QuickAction, { title: string }> = {
  tarea: { title: "Nueva tarea" },
  interaccion: { title: "Anotar interacción" },
  venta: { title: "Registrar venta" },
  cliente: { title: "Nuevo cliente" },
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
  const [ventaCliente, setVentaCliente] = useState<{
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

  function handleCloseVenta() {
    setActiveOverlay(null);
    setVentaCliente(null);
  }

  function handleVentaSaved() {
    handleCloseVenta();
    showToast("Venta registrada");
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
              : activeOverlay === "venta"
                ? handleCloseVenta
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
          <ClientPickerFlow
            cliente={interaccionCliente}
            onPick={(id, nombre) => setInteraccionCliente({ id, nombre })}
            onChangeCliente={() => setInteraccionCliente(null)}
            renderForm={(clienteId) => (
              <InteraccionForm
                clienteId={clienteId}
                onSaved={handleInteraccionSaved}
                onCancel={handleCloseInteraccion}
              />
            )}
          />
        ) : activeOverlay === "tarea" ? (
          <ClientPickerFlow
            cliente={tareaCliente}
            onPick={(id, nombre) => setTareaCliente({ id, nombre })}
            onChangeCliente={() => setTareaCliente(null)}
            renderForm={(clienteId) => (
              <SeguimientoForm
                clienteId={clienteId}
                onSaved={handleTareaSaved}
                onCancel={handleCloseTarea}
              />
            )}
          />
        ) : activeOverlay === "venta" ? (
          <ClientPickerFlow
            cliente={ventaCliente}
            onPick={(id, nombre) => setVentaCliente({ id, nombre })}
            onChangeCliente={() => setVentaCliente(null)}
            renderForm={(clienteId) => (
              <VentaForm mode="create" clienteId={clienteId} onSaved={handleVentaSaved} onCancel={handleCloseVenta} />
            )}
          />
        ) : null}
      </Overlay>
    </div>
  );
}
