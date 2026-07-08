export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysOverdue(vence: string, todayISOValue: string): number {
  const venceMs = new Date(`${vence}T00:00:00`).getTime();
  const todayMs = new Date(`${todayISOValue}T00:00:00`).getTime();
  return Math.round((todayMs - venceMs) / (24 * 60 * 60 * 1000));
}

export function overdueLabel(days: number): string {
  if (days <= 1) return "Venció ayer";
  return `Venció hace ${days} días`;
}

export function lastContactLabel(iso: string | null, todayISOValue: string): string {
  if (!iso) return "Sin contacto registrado";
  const days = daysOverdue(iso, todayISOValue);
  if (days <= 0) return "Último contacto: Hoy";
  if (days === 1) return "Último contacto: Ayer";
  if (days < 7) return `Último contacto: Hace ${days} días`;
  const weeks = Math.round(days / 7);
  return `Último contacto: Hace ${weeks} semana${weeks === 1 ? "" : "s"}`;
}

export function todayEyebrow(date = new Date()): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .toUpperCase();
}
