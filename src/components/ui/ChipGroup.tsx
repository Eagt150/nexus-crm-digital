import { useId } from "react";
import { cn } from "@/lib/utils";

interface ChipOption {
  value: string;
  label: string;
}

interface ChipGroupProps {
  label: string;
  options: ChipOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  helper?: string;
  error?: string;
}

// Grupo de chips de selección única. Reclick sobre el valor activo lo
// deselecciona (onChange(null)) — igual que el "Canal de origen" del
// handoff de diseño (F1).
export function ChipGroup({ label, options, value, onChange, helper, error }: ChipGroupProps) {
  const groupId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <span id={groupId} className="text-sm font-medium tracking-tight text-text">
        {label}
      </span>
      <div role="group" aria-labelledby={groupId} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium tracking-tight transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
                selected
                  ? "border-primary bg-primary-subtle text-primary"
                  : "border-border-strong bg-surface text-muted hover:bg-surface-2"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm text-error-text" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="text-sm text-muted">{helper}</p>
      ) : null}
    </div>
  );
}
