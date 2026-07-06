import { redirect } from "next/navigation";

export default function RootPage() {
  // INTEGRATION POINT (MCP-28): comprobar sesión antes de redirigir a
  // /login o /hoy cuando exista autenticación real.
  redirect("/hoy");
}
