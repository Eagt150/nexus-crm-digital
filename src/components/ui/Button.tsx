import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "bg-surface text-text border border-border-strong hover:bg-surface-2",
  ghost: "bg-transparent text-text hover:bg-surface-2",
  destructive: "bg-error text-white hover:brightness-95",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex h-[var(--control-h)] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium tracking-tight transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
