import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  action?: ReactNode;
  noPadding?: boolean;
}

export function Card({ className, title, action, noPadding, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-xs",
        noPadding ? "p-0" : "p-5",
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold tracking-tight text-text">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
