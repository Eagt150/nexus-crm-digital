import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListRowProps {
  avatar?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({ avatar, title, subtitle, trailing, badge, onClick, className }: ListRowProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-5 py-4 text-left",
        onClick && "transition-colors duration-fast ease-standard hover:bg-surface-2",
        className
      )}
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-medium tracking-tight text-text">{title}</p>
          {badge}
        </div>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 font-mono text-sm text-muted">{trailing}</div>}
    </Comp>
  );
}
