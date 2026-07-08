"use client";

import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { rolLabel } from "@/lib/estado";
import { useCurrentUser } from "@/lib/session";
import { api } from "../../../../convex/_generated/api";

export default function EquipoPage() {
  const currentUser = useCurrentUser();
  const users = useQuery(api.users.listAll, {});

  if (!currentUser) return null;

  if (currentUser.rol !== "propietaria") {
    return (
      <div className="mx-auto w-full max-w-[860px] px-4 py-10 md:px-8">
        <EmptyState
          icon={ShieldAlert}
          title="Acceso restringido"
          helper="Solo la Dueña puede gestionar el equipo."
        />
      </div>
    );
  }

  const isLoading = users === undefined;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-7 md:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Equipo</h1>
        <p className="mt-1 text-sm text-muted">Usuarios con acceso a Vibe CRM.</p>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!isLoading && (
        <div className="rounded-xl border border-border bg-surface shadow-xs">
          {users.map((u, index) => (
            <div key={u.id} className={index > 0 ? "border-t border-border" : undefined}>
              <ListRow
                avatar={<Avatar name={u.nombre} />}
                title={u.nombre}
                subtitle={u.email}
                badge={<Badge tone={u.rol === "propietaria" ? "info" : "neutral"}>{rolLabel(u.rol)}</Badge>}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
