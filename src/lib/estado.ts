type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

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
