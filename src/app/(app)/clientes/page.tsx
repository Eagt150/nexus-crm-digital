"use client";

import { useQuery } from "convex/react";
import { Plus, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import { Overlay } from "@/components/ui/Overlay";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { useToast } from "@/components/toast/ToastProvider";
import { lastContactLabel, todayISO } from "@/lib/date";
import { estadoToBadgeTone } from "@/lib/estado";
import { normalizePhone } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function ClientesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [localTodayISO] = useState(() => todayISO());
  const [query, setQuery] = useState("");
  const [showNewCliente, setShowNewCliente] = useState(false);

  const contacts = useQuery(api.contacts.list, {});

  function handleClienteSaved(id: Id<"contacts">) {
    setShowNewCliente(false);
    showToast("Cliente añadido");
    router.push(`/clientes/${id}`);
  }

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
  const eyebrow = isLoading
    ? ""
    : hasQuery
      ? `${filtered.length} RESULTADO${filtered.length === 1 ? "" : "S"}`
      : `${contacts.length} CLIENTE${contacts.length === 1 ? "" : "S"}`;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-7 md:px-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Clientes</h1>
        <Button
          variant="primary"
          className="hidden md:inline-flex"
          onClick={() => setShowNewCliente(true)}
        >
          <Plus className="size-4" aria-hidden />
          Nuevo cliente
        </Button>
      </header>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, email o teléfono"
          aria-label="Buscar clientes"
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

      {!isLoading && (
        <p className="text-xs font-semibold uppercase tracking-caps text-subtle">{eyebrow}</p>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && hasQuery && (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          helper={`No hay clientes que coincidan con "${query}".`}
          action={
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-sm font-medium text-primary hover:underline"
            >
              Limpiar búsqueda
            </button>
          }
        />
      )}

      {!isLoading && filtered.length === 0 && !hasQuery && (
        <EmptyState
          icon={Users}
          title="Todavía no hay clientes"
          helper="Los clientes que añadas aparecerán aquí."
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-xl border border-border bg-surface shadow-xs">
          {filtered.map((c, index) => (
            <div key={c.id} className={index > 0 ? "border-t border-border" : undefined}>
              <ListRow
                avatar={<Avatar name={c.nombre} />}
                title={c.nombre}
                subtitle={lastContactLabel(c.ultimoContacto, localTodayISO)}
                badge={<Badge tone={estadoToBadgeTone(c.estado)}>{c.estado ?? "Sin estado"}</Badge>}
                onClick={() => router.push(`/clientes/${c.id}`)}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        aria-label="Nuevo cliente"
        onClick={() => setShowNewCliente(true)}
        className="fixed bottom-[84px] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-colors duration-fast ease-standard hover:bg-primary-hover focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] md:hidden"
      >
        <Plus className="size-6" aria-hidden />
      </button>

      <Overlay open={showNewCliente} onClose={() => setShowNewCliente(false)} title="Nuevo cliente">
        <ClienteForm
          mode="create"
          onSaved={handleClienteSaved}
          onCancel={() => setShowNewCliente(false)}
        />
      </Overlay>
    </div>
  );
}
