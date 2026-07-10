"use client";

import { useQuery } from "convex/react";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ListRow } from "@/components/ui/ListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { normalizePhone } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface ClientePickerProps {
  onSelect: (id: Id<"contacts">, nombre: string) => void;
}

// Selector de cliente con búsqueda en tiempo real, para overlays que se
// abren sin cliente fijado (p. ej. "Anotar interacción" desde Hoy). No
// conoce Overlay/pasos previos/siguientes — solo reporta la elección via
// onSelect, igual que ClienteForm/InteraccionForm reportan via onSaved.
export function ClientePicker({ onSelect }: ClientePickerProps) {
  const [query, setQuery] = useState("");
  const contacts = useQuery(api.contacts.list, {});

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return contacts;
    const normalizedPhoneQuery = normalizePhone(trimmed);
    return contacts.filter((c) => {
      if (c.nombre.toLowerCase().includes(trimmed)) return true;
      if (c.email?.toLowerCase().includes(trimmed)) return true;
      if (c.telefono && normalizePhone(c.telefono.toLowerCase()).includes(normalizedPhoneQuery)) {
        return true;
      }
      return false;
    });
  }, [contacts, query]);

  const isLoading = contacts === undefined;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
          aria-hidden
        />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, email o teléfono"
          aria-label="Buscar cliente"
          className="h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface pl-10 pr-10 text-base text-text placeholder:text-subtle focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        />
        {hasQuery && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:bg-surface-2 hover:text-text"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-muted">
          {hasQuery ? `Sin resultados para "${query}".` : "Todavía no hay clientes."}
        </p>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border bg-surface shadow-xs">
          {filtered.map((c, index) => (
            <div key={c.id} className={index > 0 ? "border-t border-border" : undefined}>
              <ListRow
                avatar={<Avatar name={c.nombre} />}
                title={c.nombre}
                subtitle={c.empresa}
                onClick={() => onSelect(c.id, c.nombre)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
