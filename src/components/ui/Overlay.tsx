"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// Overlay pattern from the design handoff: bottom sheet on mobile, centered
// modal on desktop. Closes on Esc, scrim click, or the close button, and
// traps focus while open (Tab/Shift+Tab cycles inside the dialog).
export function Overlay({ open, onClose, title, children }: OverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const firstField = dialog?.querySelector<HTMLElement>(
      "input, textarea, select, button"
    );
    firstField?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,24,32,.45)] md:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-lg md:max-w-[480px] md:rounded-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-text">{title}</h2>
          <IconButton aria-label="Cerrar" onClick={onClose}>
            <X className="size-5" strokeWidth={1.5} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
