import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  helper?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, helper, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Icon className="size-8 text-subtle" strokeWidth={1.5} aria-hidden />
      <p className="text-base font-medium tracking-tight text-text">{title}</p>
      {helper && <p className="text-sm text-muted">{helper}</p>}
      {action}
    </div>
  );
}
