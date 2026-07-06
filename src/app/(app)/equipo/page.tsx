"use client";

import { ShieldAlert } from "lucide-react";
import { PageStub } from "@/components/PageStub";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentUser } from "@/lib/session";

export default function EquipoPage() {
  const currentUser = useCurrentUser();

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

  return (
    <PageStub
      title="Equipo"
      note="Gestión de usuarios y roles — pendiente de implementar (MCP-72)."
    />
  );
}
