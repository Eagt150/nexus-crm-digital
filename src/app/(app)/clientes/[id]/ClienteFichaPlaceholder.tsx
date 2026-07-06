"use client";

import { useQuery } from "convex/react";
import { PageStub } from "@/components/PageStub";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function ClienteFichaPlaceholder({ id }: { id: string }) {
  const cliente = useQuery(api.contacts.getById, { id: id as Id<"contacts"> });

  return (
    <PageStub
      title={cliente === undefined ? "Cargando…" : (cliente?.nombre ?? "Cliente no encontrado")}
      note="Ficha completa del cliente (datos, seguimientos, historial) — pendiente de implementar (MCP-32)."
    />
  );
}
