"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { daysOverdue, overdueLabel } from "@/lib/date";
import { estadoToBadgeTone } from "@/lib/estado";
import type { Id } from "@convex/_generated/dataModel";

interface FollowUpRowProps {
  id: Id<"seguimientos">;
  clienteId: Id<"contacts">;
  clienteNombre: string;
  clienteEstado?: string;
  accion: string;
  responsableNombre: string;
  urgency: "atrasado" | "hoy";
  vence: string;
  todayISOValue: string;
  onDone: (id: Id<"seguimientos">) => void;
}

export function FollowUpRow({
  id,
  clienteId,
  clienteNombre,
  clienteEstado,
  accion,
  responsableNombre,
  urgency,
  vence,
  todayISOValue,
  onDone,
}: FollowUpRowProps) {
  const estadoLabel = clienteEstado
    ? clienteEstado.charAt(0).toUpperCase() + clienteEstado.slice(1)
    : "Sin estado";

  return (
    <div className="flex items-center gap-1 border-t border-border py-2 first:border-t-0">
      <button
        type="button"
        aria-label={`Marcar seguimiento de ${clienteNombre} como hecho`}
        onClick={() => onDone(id)}
        className="flex size-11 shrink-0 items-center justify-center"
      >
        <span
          className="size-6 rounded-full border-[1.5px] border-border-strong transition-colors duration-fast ease-standard hover:border-primary"
          aria-hidden
        />
      </button>
      <Link href={`/clientes/${clienteId}`} className="flex min-w-0 flex-1 items-center gap-3 py-1">
        <Avatar name={clienteNombre} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text">{clienteNombre}</span>
            <Badge tone={estadoToBadgeTone(clienteEstado)}>{estadoLabel}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="truncate text-sm text-muted">{accion}</span>
            <Avatar name={responsableNombre} size="sm" />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={urgency === "atrasado" ? "error" : "neutral"}>
            {urgency === "atrasado" ? "Atrasado" : "Hoy"}
          </Badge>
          {urgency === "atrasado" && (
            <span className="text-xs text-error-text">
              {overdueLabel(daysOverdue(vence, todayISOValue))}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
