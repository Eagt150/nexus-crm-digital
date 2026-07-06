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
