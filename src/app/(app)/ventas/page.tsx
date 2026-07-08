"use client";

import { useQuery } from "convex/react";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import { Metric } from "@/components/ui/Metric";
import { Skeleton } from "@/components/ui/Skeleton";
import { ventaEstadoLabel, ventaEstadoToBadgeTone, type VentaEstado } from "@/lib/estado";
import { cn, formatEuro } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";

type Filter = "todas" | VentaEstado;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "oportunidad", label: "En marcha" },
  { id: "ganada", label: "Ganadas" },
  { id: "perdida", label: "Perdidas" },
];

const EMPTY_COPY: Record<Filter, { title: string; helper: string }> = {
  todas: { title: "Todavía no hay ventas", helper: "Las ventas y oportunidades que registres aparecerán aquí." },
  oportunidad: { title: "Sin oportunidades en marcha", helper: "Aquí verás el pipeline abierto." },
  ganada: { title: "Sin ventas ganadas todavía", helper: "Las ventas cerradas aparecerán aquí." },
  perdida: { title: "Sin ventas perdidas", helper: "Aquí aparecerán las oportunidades que no salgan adelante." },
};

export default function VentasPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("todas");
  const ventas = useQuery(api.ventas.list, {});
  const isLoading = ventas === undefined;

  const { enMarcha, ganado, counts } = useMemo(() => {
    const rows = ventas ?? [];
    return {
      enMarcha: rows.filter((v) => v.estado === "oportunidad").reduce((sum, v) => sum + v.importe, 0),
      ganado: rows.filter((v) => v.estado === "ganada").reduce((sum, v) => sum + v.importe, 0),
      counts: {
        todas: rows.length,
        oportunidad: rows.filter((v) => v.estado === "oportunidad").length,
        ganada: rows.filter((v) => v.estado === "ganada").length,
        perdida: rows.filter((v) => v.estado === "perdida").length,
      },
    };
  }, [ventas]);

  const filtered = useMemo(() => {
    if (!ventas) return [];
    if (filter === "todas") return ventas;
    return ventas.filter((v) => v.estado === filter);
  }, [ventas, filter]);

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 py-7 md:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Ventas</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="En marcha"
          value={isLoading ? "—" : formatEuro(enMarcha)}
          hint={isLoading ? undefined : `${counts.oportunidad} oportunidad${counts.oportunidad === 1 ? "" : "es"}`}
          tone="info"
        />
        <Metric
          label="Ganado"
          value={isLoading ? "—" : formatEuro(ganado)}
          hint={isLoading ? undefined : `${counts.ganada} venta${counts.ganada === 1 ? "" : "s"}`}
          tone="success"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium tracking-tight transition-colors duration-fast ease-standard",
              filter === f.id
                ? "border-primary bg-primary-subtle text-primary"
                : "border-border-strong bg-surface text-muted hover:bg-surface-2"
            )}
          >
            {f.label} {!isLoading && `· ${counts[f.id === "todas" ? "todas" : f.id]}`}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState icon={TrendingUp} title={EMPTY_COPY[filter].title} helper={EMPTY_COPY[filter].helper} />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-xl border border-border bg-surface shadow-xs">
          {filtered.map((v, index) => (
            <div key={v.id} className={index > 0 ? "border-t border-border" : undefined}>
              <ListRow
                title={v.concepto}
                subtitle={v.cliente.nombre}
                badge={<Badge tone={ventaEstadoToBadgeTone(v.estado)}>{ventaEstadoLabel(v.estado)}</Badge>}
                trailing={
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={cn(
                        "font-mono text-sm tabular-nums",
                        v.estado === "ganada" ? "text-success" : "text-text"
                      )}
                    >
                      {formatEuro(v.importe)}
                    </span>
                    <span className="text-xs text-subtle">{v.fecha}</span>
                  </div>
                }
                onClick={() => router.push(`/clientes/${v.cliente.id}`)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
