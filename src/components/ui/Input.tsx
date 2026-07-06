import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium tracking-tight text-text">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          className={cn(
            "h-[var(--control-h)] rounded-md border border-border-strong bg-surface px-3 text-base text-text placeholder:text-subtle focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
            error && "border-error",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-sm text-error-text" role="alert">
            {error}
          </p>
        ) : helper ? (
          <p id={`${inputId}-helper`} className="text-sm text-muted">
            {helper}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
