import { MessageCircle, Phone, Users, Mail, type LucideIcon } from "lucide-react";
import type { TipoInteraccion } from "@/components/interacciones/InteraccionForm";

// Icono por canal de una Interacción (D-02.tipo) — no confundir con
// `canalOrigen` del cliente (D-01, web/redes/email/whatsapp), que es un
// conjunto de valores distinto.
export function tipoInteraccionIcon(tipo: TipoInteraccion): LucideIcon {
  switch (tipo) {
    case "llamada":
      return Phone;
    case "email":
      return Mail;
    case "whatsapp":
      return MessageCircle;
    case "en_persona":
      return Users;
  }
}

export function tipoInteraccionLabel(tipo: TipoInteraccion): string {
  switch (tipo) {
    case "llamada":
      return "Llamada";
    case "email":
      return "Email";
    case "whatsapp":
      return "WhatsApp";
    case "en_persona":
      return "En persona";
  }
}
