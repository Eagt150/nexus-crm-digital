"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Overlay } from "@/components/ui/Overlay";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { InteraccionForm } from "@/components/interacciones/InteraccionForm";
import { SeguimientoForm } from "@/components/seguimientos/SeguimientoForm";
import { VentaForm } from "@/components/ventas/VentaForm";
import { useToast } from "@/components/toast/ToastProvider";
import { daysOverdue, overdueLabel, todayISO } from "@/lib/date";
import { estadoToBadgeTone, parseEstadoCliente, ventaEstadoLabel, ventaEstadoToBadgeTone } from "@/lib/estado";
import { tipoInteraccionIcon, tipoInteraccionLabel } from "@/lib/canal";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const CANAL_ORIGEN_LABEL: Record<string, string> = {
  web: "Web",
  redes: "Redes",
  email: "Email",
  whatsapp: "WhatsApp",
};

type ActiveOverlay = "editar" | "interaccion" | "seguimiento" | "venta" | null;

type HistorialItem =
  | { kind: "interaccion"; fecha: string; id: string; tipo: string; texto: string; autorNombre: string }
  | {
      kind: "venta";
      fecha: string;
      id: string;
      concepto: string;
      importe: number;
      estado: "oportunidad" | "ganada" | "perdida";
      autorNombre: string;
    }
  | { kind: "seguimiento_completado"; fecha: string; id: string; responsableNombre: string };

export function ClienteFicha({ id }: { id: string }) {
  const clienteId = id as Id<"contacts">;
  const { showToast } = useToast();
  const [localTodayISO] = useState(() => todayISO());
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);

  const cliente = useQuery(api.contacts.getById, { id: clienteId });
  const interacciones = useQuery(
    api.interacciones.listByCliente,
    cliente ? { clienteId } : "skip"
  );
  const seguimientos = useQuery(
    api.seguimientos.listByCliente,
    cliente ? { clienteId } : "skip"
  );
  const ventas = useQuery(api.ventas.listByCliente, cliente ? { clienteId } : "skip");

  const markDone = useMutation(api.seguimientos.markDone).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.seguimientos.listByCliente, { clienteId });
    if (current !== undefined) {
      store.setQuery(
        api.seguimientos.listByCliente,
        { clienteId },
        current.map((row) =>
          row.id === args.id ? { ...row, hecho: true, fechaHecho: localTodayISO } : row
        )
      );
    }
  });

  async function handleDone(seguimientoId: Id<"seguimientos">) {
    try {
      await markDone({ id: seguimientoId });
      showToast("Seguimiento completado");
    } catch {
      showToast("No se pudo marcar como hecho: no eres responsable de este seguimiento.");
    }
  }

  const childLoading =
    interacciones === undefined || seguimientos === undefined || ventas === undefined;

  const pendientes = useMemo(() => {
    if (!seguimientos) return [];
    return seguimientos.filter((s) => !s.hecho).sort((a, b) => a.vence.localeCompare(b.vence));
  }, [seguimientos]);

  const historial = useMemo((): HistorialItem[] => {
    if (!interacciones || !ventas || !seguimientos) return [];

    const items: HistorialItem[] = [
      ...interacciones.map((i) => ({
        kind: "interaccion" as const,
        fecha: i.fecha,
        id: i.id,
        tipo: i.tipo,
        texto: i.texto,
        autorNombre: i.autor.nombre,
      })),
      ...ventas.map((v) => ({
        kind: "venta" as const,
        fecha: v.fecha,
        id: v.id,
        concepto: v.concepto,
        importe: v.importe,
        estado: v.estado,
        autorNombre: v.autor.nombre,
      })),
      ...seguimientos
        .filter((s) => s.hecho)
        .map((s) => ({
          kind: "seguimiento_completado" as const,
          fecha: s.fechaHecho ?? s.vence,
          id: s.id,
          responsableNombre: s.responsable.nombre,
        })),
    ];

    return items.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [interacciones, ventas, seguimientos]);

  if (cliente === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-7 md:px-8">
        <Skeleton className="h-8 w-40" />
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-xs">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (cliente === null) {
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-7 md:px-8">
        <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" aria-hidden />
          Clientes
        </Link>
        <p className="text-base text-text">Cliente no encontrado.</p>
      </div>
    );
  }

  const estadoClienteParsed = parseEstadoCliente(cliente.estado);

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 py-7 md:px-8">
      <header className="flex items-center justify-between gap-3">
        <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" aria-hidden />
          Clientes
        </Link>
        <button
          type="button"
          onClick={() => setActiveOverlay("editar")}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-text transition-colors duration-fast ease-standard hover:bg-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <Pencil className="size-4" aria-hidden />
          Editar
        </button>
      </header>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Avatar name={cliente.nombre} size="md" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-text">{cliente.nombre}</h1>
            {cliente.empresa && <p className="truncate text-sm text-muted">{cliente.empresa}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={estadoToBadgeTone(cliente.estado)}>{cliente.estado ?? "Sin estado"}</Badge>
          {cliente.canalOrigen && (
            <Badge tone="neutral">Origen: {CANAL_ORIGEN_LABEL[cliente.canalOrigen] ?? cliente.canalOrigen}</Badge>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {cliente.telefono && (
            <a
              href={`tel:${cliente.telefono}`}
              className="flex items-center gap-2 text-sm text-text hover:underline"
            >
              <Phone className="size-4 text-subtle" aria-hidden />
              {cliente.telefono}
            </a>
          )}
          {cliente.email && (
            <a
              href={`mailto:${cliente.email}`}
              className="flex items-center gap-2 text-sm text-text hover:underline"
            >
              <Mail className="size-4 text-subtle" aria-hidden />
              {cliente.email}
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={() => setActiveOverlay("interaccion")}
          className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-xs transition-colors duration-fast ease-standard hover:bg-surface-2"
        >
          <MessageSquare className="size-5 text-primary" aria-hidden />
          <span className="text-sm font-medium text-text">Anotar interacción</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveOverlay("seguimiento")}
          className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-xs transition-colors duration-fast ease-standard hover:bg-surface-2"
        >
          <CalendarClock className="size-5 text-primary" aria-hidden />
          <span className="text-sm font-medium text-text">Programar seguimiento</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveOverlay("venta")}
          className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-xs transition-colors duration-fast ease-standard hover:bg-surface-2"
        >
          <HandCoins className="size-5 text-primary" aria-hidden />
          <span className="text-sm font-medium text-text">Registrar venta</span>
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-text">Seguimientos pendientes</h2>
        {childLoading && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-xs">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {!childLoading && pendientes.length === 0 && (
          <p className="text-sm text-muted">Sin seguimientos pendientes.</p>
        )}
        {!childLoading && pendientes.length > 0 && (
          <div className="rounded-xl border border-border bg-surface shadow-xs">
            {pendientes.map((row, index) => {
              const days = daysOverdue(row.vence, localTodayISO);
              const atrasado = days > 0;
              const subLabel = atrasado ? overdueLabel(days) : days === 0 ? "Vence hoy" : `Vence el ${row.vence}`;
              return (
                <div
                  key={row.id}
                  className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <button
                    type="button"
                    disabled={!row.canMarkDone}
                    aria-label={
                      row.canMarkDone
                        ? `Marcar "${row.accion}" como hecho`
                        : `Solo ${row.responsable.nombre} o la propietaria pueden marcar "${row.accion}" como hecho`
                    }
                    title={row.canMarkDone ? undefined : `Asignado a ${row.responsable.nombre}`}
                    onClick={() => handleDone(row.id)}
                    className="flex size-8 shrink-0 items-center justify-center disabled:cursor-not-allowed"
                  >
                    <span
                      className={`size-6 rounded-full border-[1.5px] transition-colors duration-fast ease-standard ${
                        row.canMarkDone
                          ? "border-border-strong hover:border-primary"
                          : "border-border opacity-50"
                      }`}
                      aria-hidden
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{row.accion}</p>
                    <p className={`truncate text-sm ${atrasado ? "text-error-text" : "text-muted"}`}>{subLabel}</p>
                  </div>
                  <Avatar name={row.responsable.nombre} size="sm" />
                  <Badge tone={atrasado ? "error" : "neutral"}>{atrasado ? "Atrasado" : "Pendiente"}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-text">Historial</h2>
        {childLoading && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-xs">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {!childLoading && historial.length === 0 && (
          <p className="text-sm text-muted">Sin actividad todavía.</p>
        )}
        {!childLoading && historial.length > 0 && (
          <div className="rounded-xl border border-border bg-surface shadow-xs">
            {historial.map((item, index) => (
              <div
                key={`${item.kind}-${item.id}`}
                className={`flex items-start gap-3 px-5 py-4 ${index > 0 ? "border-t border-border" : ""}`}
              >
                {item.kind === "interaccion" && (
                  <>
                    {(() => {
                      const Icon = tipoInteraccionIcon(item.tipo as Parameters<typeof tipoInteraccionIcon>[0]);
                      return <Icon className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />;
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text">
                        <span className="font-medium">
                          {tipoInteraccionLabel(item.tipo as Parameters<typeof tipoInteraccionLabel>[0])}:
                        </span>{" "}
                        {item.texto}
                      </p>
                      <p className="text-sm text-muted">Registrado por {item.autorNombre}</p>
                    </div>
                  </>
                )}
                {item.kind === "venta" && (
                  <>
                    <TrendingUp className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-text">{item.concepto}</p>
                        <Badge tone={ventaEstadoToBadgeTone(item.estado)}>{ventaEstadoLabel(item.estado)}</Badge>
                      </div>
                      <p className="text-sm text-muted">Registrado por {item.autorNombre}</p>
                    </div>
                    <span className="shrink-0 font-mono text-sm text-success-text">
                      {item.importe.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </span>
                  </>
                )}
                {item.kind === "seguimiento_completado" && (
                  <>
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text">Seguimiento completado</p>
                      <p className="text-sm text-muted">Responsable: {item.responsableNombre}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Overlay open={activeOverlay === "editar"} onClose={() => setActiveOverlay(null)} title="Editar cliente">
        <ClienteForm
          mode="edit"
          contact={{
            id: clienteId,
            nombre: cliente.nombre,
            empresa: cliente.empresa,
            telefono: cliente.telefono,
            email: cliente.email,
            canalOrigen: cliente.canalOrigen,
            nota: cliente.nota,
            estado: estadoClienteParsed,
          }}
          onSaved={() => setActiveOverlay(null)}
          onCancel={() => setActiveOverlay(null)}
        />
      </Overlay>

      <Overlay
        open={activeOverlay === "interaccion"}
        onClose={() => setActiveOverlay(null)}
        title="Anotar interacción"
      >
        <InteraccionForm
          clienteId={clienteId}
          onSaved={() => {
            setActiveOverlay(null);
            showToast("Interacción registrada");
          }}
          onCancel={() => setActiveOverlay(null)}
        />
      </Overlay>

      <Overlay
        open={activeOverlay === "seguimiento"}
        onClose={() => setActiveOverlay(null)}
        title="Programar seguimiento"
      >
        <SeguimientoForm
          clienteId={clienteId}
          onSaved={() => {
            setActiveOverlay(null);
            showToast("Seguimiento programado");
          }}
          onCancel={() => setActiveOverlay(null)}
        />
      </Overlay>

      <Overlay open={activeOverlay === "venta"} onClose={() => setActiveOverlay(null)} title="Registrar venta">
        <VentaForm
          clienteId={clienteId}
          onSaved={() => {
            setActiveOverlay(null);
            showToast("Venta registrada");
          }}
          onCancel={() => setActiveOverlay(null)}
        />
      </Overlay>
    </div>
  );
}
