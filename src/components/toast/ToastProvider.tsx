"use client";

import { Check } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ShowToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (message: string, options?: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, options?: ShowToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const id = ++nextId.current;
    setToast({ id, message, actionLabel: options?.actionLabel, onAction: options?.onAction });

    const duration = options?.durationMs ?? (options?.actionLabel ? 3800 : 2600);
    timeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[1100] flex justify-center px-4 md:bottom-6">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-[var(--color-text)] px-4 py-3 text-white shadow-lg">
            <Check className="size-[18px] text-primary" strokeWidth={1.5} aria-hidden />
            <span className="text-sm">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                className="text-sm font-semibold text-primary"
                onClick={() => {
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                  setToast(null);
                  toast.onAction?.();
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
