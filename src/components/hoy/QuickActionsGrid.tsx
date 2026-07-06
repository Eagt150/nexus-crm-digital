"use client";

import { Plus, Pencil, TrendingUp, UserPlus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickAction = "tarea" | "interaccion" | "venta" | "cliente";

interface Tile {
  key: QuickAction;
  label: string;
  icon: LucideIcon;
  emphasis?: boolean;
}

const TILES: Tile[] = [
  { key: "tarea", label: "Nueva tarea", icon: Plus, emphasis: true },
  { key: "interaccion", label: "Anotar interacción", icon: Pencil },
  { key: "venta", label: "Registrar venta", icon: TrendingUp },
  { key: "cliente", label: "Nuevo cliente", icon: UserPlus },
];

export function QuickActionsGrid({ onAction }: { onAction: (action: QuickAction) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => onAction(tile.key)}
            className="flex min-h-[60px] items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-xs transition-colors duration-fast ease-standard hover:bg-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                tile.emphasis ? "bg-primary text-on-primary" : "bg-primary-subtle text-primary"
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="text-sm font-medium text-text">{tile.label}</span>
          </button>
        );
      })}
    </div>
  );
}
