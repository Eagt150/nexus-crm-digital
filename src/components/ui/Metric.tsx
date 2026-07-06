import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "info" | "neutral";
  className?: string;
}

const toneClasses = {
  success: "text-success",
  info: "text-info",
  neutral: "text-text",
} as const;

export function Metric({ label, value, hint, tone = "neutral", className }: MetricProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-xs", className)}>
      <p className="text-xs font-medium uppercase tracking-caps text-subtle">{label}</p>
      <p className={cn("mt-2 font-mono text-3xl tabular-nums", toneClasses[tone])}>{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}
