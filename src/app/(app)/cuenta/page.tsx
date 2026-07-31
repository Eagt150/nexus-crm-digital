"use client";

import { ChevronRight, KeyRound, LogOut, Pencil } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListRow } from "@/components/ui/ListRow";
import { Overlay } from "@/components/ui/Overlay";
import { useToast } from "@/components/toast/ToastProvider";
import { CambiarPasswordForm } from "@/components/cuenta/CambiarPasswordForm";
import { EditarDatosForm } from "@/components/cuenta/EditarDatosForm";
import { rolLabel } from "@/lib/estado";
import { useCurrentUser } from "@/lib/session";

type OverlayState = "editar-datos" | "cambiar-password" | null;

export default function CuentaPage() {
  const currentUser = useCurrentUser();
  const { showToast } = useToast();

  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (!currentUser) return null;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-7 md:px-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Mi cuenta</p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">{currentUser.nombre}</h1>
      </header>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
        <Avatar name={currentUser.nombre} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium tracking-tight text-text">{currentUser.nombre}</p>
          <p className="truncate text-sm text-muted">{currentUser.email}</p>
        </div>
        <Badge tone={currentUser.rol === "propietaria" ? "info" : "neutral"}>
          {rolLabel(currentUser.rol)}
        </Badge>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-xs">
        <ListRow
          avatar={<Pencil className="size-5 text-muted" aria-hidden />}
          title="Editar mis datos"
          onClick={() => setOverlay("editar-datos")}
          trailing={<ChevronRight className="size-4" aria-hidden />}
        />
        <div className="border-t border-border">
          <ListRow
            avatar={<KeyRound className="size-5 text-muted" aria-hidden />}
            title="Cambiar contraseña"
            subtitle={
              !currentUser.tienePassword
                ? "Entras con Google — no tienes contraseña que cambiar"
                : undefined
            }
            onClick={currentUser.tienePassword ? () => setOverlay("cambiar-password") : undefined}
            trailing={
              currentUser.tienePassword ? <ChevronRight className="size-4" aria-hidden /> : undefined
            }
            className={!currentUser.tienePassword ? "opacity-60" : undefined}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="destructive"
        className="w-full"
        onClick={() => setConfirmLogout(true)}
      >
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </Button>

      <Overlay
        open={overlay === "editar-datos"}
        onClose={() => setOverlay(null)}
        title="Editar mis datos"
      >
        <EditarDatosForm
          nombre={currentUser.nombre}
          email={currentUser.email}
          tienePassword={currentUser.tienePassword}
          onSaved={() => {
            setOverlay(null);
            showToast("Datos actualizados");
          }}
          onCancel={() => setOverlay(null)}
        />
      </Overlay>

      <Overlay
        open={overlay === "cambiar-password"}
        onClose={() => setOverlay(null)}
        title="Cambiar contraseña"
      >
        <CambiarPasswordForm onCancel={() => setOverlay(null)} />
      </Overlay>

      <ConfirmDialog
        open={confirmLogout}
        title="Cerrar sesión"
        message="¿Seguro que quieres cerrar sesión? Tendrás que volver a iniciar sesión para acceder."
        confirmLabel="Cerrar sesión"
        onConfirm={() => signOut({ callbackUrl: "/login" })}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
