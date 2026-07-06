import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md";
  className?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("");
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-subtle font-medium text-primary",
        size === "sm" ? "size-8 text-xs" : "size-10 text-sm",
        className
      )}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}
