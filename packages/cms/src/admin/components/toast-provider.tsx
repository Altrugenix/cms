import { X } from "lucide-react";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  closing?: boolean;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  error: "bg-destructive text-destructive-foreground border-destructive/20",
  info: "bg-info text-info-foreground border-info/20",
  success: "bg-success text-success-foreground border-success/20",
};

const variantIcons: Record<ToastVariant, string> = {
  error: "✕",
  info: "ℹ",
  success: "✓",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    const timeout = variant === "error" ? 8000 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, timeout);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ dismiss, toast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${variantStyles[t.variant]}`}
            style={{
              animation: t.closing ? "toast-out 0.3s ease-in forwards" : "toast-in 0.3s ease-out",
            }}
          >
            <span className="mt-0.5 font-mono text-xs">{variantIcons[t.variant]}</span>
            <p className="flex-1">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
