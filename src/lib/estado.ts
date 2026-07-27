import type { EstadoCliente } from "@/components/clientes/ClienteForm";

type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

const ESTADO_CLIENTE_VALUES: readonly EstadoCliente[] = ["activo", "seguimiento", "inactivo"];

// `contacts.getById` devuelve `estado` como el string suelto que guarda el
// schema (`v.optional(v.string())`), pero `ClienteForm mode="edit"` espera la
// unión cerrada de `EstadoCliente`. Acota aquí en vez de castear con `as` en
// el caller, para no propagar un valor legacy/no reconocido como si fuera
// válido.
export function parseEstadoCliente(value?: string): EstadoCliente | undefined {
  return ESTADO_CLIENTE_VALUES.find((v) => v === value);
}

export function estadoToBadgeTone(estado?: string): BadgeTone {
  switch (estado) {
    case "activo":
      return "success";
    case "seguimiento":
      return "warning";
    case "inactivo":
      return "neutral";
    default:
      return "neutral";
  }
}

export type VentaEstado = "oportunidad" | "ganada" | "perdida";

export function ventaEstadoLabel(estado: VentaEstado): string {
  switch (estado) {
    case "oportunidad":
      return "Oportunidad abierta";
    case "ganada":
      return "Ganada";
    case "perdida":
      return "Perdida";
  }
}

export function ventaEstadoToBadgeTone(estado: VentaEstado): BadgeTone {
  switch (estado) {
    case "oportunidad":
      return "info";
    case "ganada":
      return "success";
    case "perdida":
      return "neutral";
  }
}

export function rolLabel(rol: "propietaria" | "comercial"): string {
  return rol === "propietaria" ? "Dueña" : "Atiende y vende";
}
