import { cn } from "@/lib/utils";

type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success-text",
  warning: "bg-warning-bg text-warning-text",
  error: "bg-error-bg text-error-text",
  info: "bg-info-bg text-info-text",
  neutral: "bg-surface-2 text-muted",
};

const dotClasses: Record<BadgeTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
  neutral: "bg-subtle",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-tight",
        toneClasses[tone],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotClasses[tone])} aria-hidden />
      {children}
    </span>
  );
}
