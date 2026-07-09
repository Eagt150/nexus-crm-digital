const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Regex + roundtrip: un formato válido (YYYY-MM-DD) no basta, porque
// "2026-99-99" lo cumple pero no es una fecha real. Se reconstruye la fecha
// y se compara contra el string original para descartar esos casos.
export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
