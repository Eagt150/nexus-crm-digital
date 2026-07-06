import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FollowUpSectionProps {
  label: string;
  tone: "error" | "neutral";
  count: number;
  children: ReactNode;
}

export function FollowUpSection({ label, tone, count, children }: FollowUpSectionProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-xs",
        tone === "error" && "border-t-[3px] border-t-error"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5",
          tone === "error" && "bg-error-bg"
        )}
      >
        <span
          className={cn("size-2 rounded-full", tone === "error" ? "bg-error" : "bg-subtle")}
          aria-hidden
        />
        <span
          className={cn(
            "text-[13px] font-semibold uppercase tracking-caps",
            tone === "error" ? "text-error-text" : "text-muted"
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "ml-auto font-mono text-[13px] font-semibold",
            tone === "error" ? "text-error-text" : "text-muted"
          )}
        >
          {count}
        </span>
      </div>
      <div className="px-4 pb-2">{children}</div>
    </div>
  );
}
