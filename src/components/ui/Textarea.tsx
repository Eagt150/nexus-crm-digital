import { type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helper?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helper, id, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={textareaId} className="text-sm font-medium tracking-tight text-text">
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${textareaId}-error` : helper ? `${textareaId}-helper` : undefined}
          className={cn(
            "min-h-[84px] rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text placeholder:text-subtle focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
            error && "border-error",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="text-sm text-error-text" role="alert">
            {error}
          </p>
        ) : helper ? (
          <p id={`${textareaId}-helper`} className="text-sm text-muted">
            {helper}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
