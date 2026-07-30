"use client";

import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { ListRow } from "@/components/ui/ListRow";
import { Overlay } from "@/components/ui/Overlay";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/toast/ToastProvider";
import { UsuarioForm, type UsuarioEditData } from "@/components/equipo/UsuarioForm";
import { rolLabel } from "@/lib/estado";
import { useCurrentUser } from "@/lib/session";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type OverlayState = { kind: "create" } | { kind: "edit"; usuario: UsuarioEditData } | null;

export default function EquipoPage() {
  const currentUser = useCurrentUser();
  const users = useQuery(api.users.listAll, {});
  const removeUser = useMutation(api.users.removeUser);
  const { showToast } = useToast();

  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [pendingDelete, setPendingDelete] = useState<UsuarioEditData | null>(null);

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
  const propietariaCount = users?.filter((u) => u.rol === "propietaria").length ?? 0;

  async function handleDelete(userId: Id<"users">) {
    try {
      await removeUser({ userId });
      showToast("Usuario eliminado");
    } catch {
      showToast("No se pudo eliminar el usuario. Inténtalo de nuevo.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-7 md:px-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Equipo</h1>
          <p className="mt-1 text-sm text-muted">Usuarios con acceso a Vibe CRM.</p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="flex-none"
          onClick={() => setOverlay({ kind: "create" })}
        >
          <Plus className="size-4" aria-hidden />
          Añadir usuario
        </Button>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!isLoading && (
        <div className="rounded-xl border border-border bg-surface shadow-xs">
          {users.map((u, index) => {
            const isSelf = u.id === currentUser.id;
            const isLastPropietaria = u.rol === "propietaria" && propietariaCount === 1;
            return (
              <div key={u.id} className={index > 0 ? "border-t border-border" : undefined}>
                <ListRow
                  avatar={<Avatar name={u.nombre} />}
                  title={u.nombre}
                  subtitle={u.email}
                  badge={
                    <Badge tone={u.rol === "propietaria" ? "info" : "neutral"}>
                      {rolLabel(u.rol)}
                    </Badge>
                  }
                  trailing={
                    <div className="flex items-center gap-1">
                      <IconButton
                        aria-label={`Editar a ${u.nombre}`}
                        onClick={() => setOverlay({ kind: "edit", usuario: u })}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </IconButton>
                      {!isSelf && !isLastPropietaria && (
                        <IconButton
                          aria-label={`Eliminar a ${u.nombre}`}
                          onClick={() => setPendingDelete(u)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </IconButton>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <Overlay
        open={overlay?.kind === "create"}
        onClose={() => setOverlay(null)}
        title="Añadir usuario"
      >
        <UsuarioForm
          mode="create"
          otherEmails={users?.map((u) => u.email) ?? []}
          onSaved={() => {
            setOverlay(null);
            showToast("Usuario creado");
          }}
          onCancel={() => setOverlay(null)}
        />
      </Overlay>

      <Overlay
        open={overlay?.kind === "edit"}
        onClose={() => setOverlay(null)}
        title="Editar usuario"
      >
        {overlay?.kind === "edit" && (
          <UsuarioForm
            mode="edit"
            usuario={overlay.usuario}
            otherEmails={users?.filter((u) => u.id !== overlay.usuario.id).map((u) => u.email) ?? []}
            lockRolePropietaria={
              overlay.usuario.rol === "propietaria" && propietariaCount === 1
            }
            onSaved={() => {
              setOverlay(null);
              showToast("Usuario actualizado");
            }}
            onCancel={() => setOverlay(null)}
          />
        )}
      </Overlay>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar usuario"
        message={
          pendingDelete
            ? `¿Seguro que quieres eliminar a ${pendingDelete.nombre}? Ya no podrá iniciar sesión.`
            : ""
        }
        confirmLabel="Eliminar"
        onConfirm={() => (pendingDelete ? handleDelete(pendingDelete.id) : undefined)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
