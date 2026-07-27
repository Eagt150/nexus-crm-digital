import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuro(amount: number): string {
  return `€${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-()]/g, "");
}
