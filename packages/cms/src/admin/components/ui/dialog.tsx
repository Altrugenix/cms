import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type DialogContextValue = {
  onClose: () => void;
  open: boolean;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used within <Dialog>");
  return ctx;
}

type DialogProps = {
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export function Dialog({ children, onOpenChange, open: controlledOpen }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;

  const handleClose = useCallback(() => {
    setInternalOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const ctx = useMemo(() => ({ onClose: handleClose, open }), [handleClose, open]);

  return <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>;
}

type DialogTriggerProps = HTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function DialogTrigger({ children, onClick, ...props }: DialogTriggerProps) {
  // DialogTrigger is a convenience — the consumer can toggle open externally.
  // Here we just render the children with an onClick that can be overridden.
  return (
    <button
      onClick={(e) => {
        onClick?.(e);
      }}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

type DialogContentProps = HTMLAttributes<HTMLDivElement> & {
  onEscapeKeyDown?: () => void;
};

export function DialogContent({
  children,
  className,
  onEscapeKeyDown,
  ...props
}: DialogContentProps) {
  const { onClose, open } = useDialogContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscapeKeyDown?.();
        onClose();
      }

      if (e.key === "Tab" && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Focus the content element
    requestAnimationFrame(() => contentRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [onClose, onEscapeKeyDown, open]);

  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-overlay"
        style={{ animation: "fade-in 0.15s ease-out" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          aria-modal="true"
          className={cn(
            "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            className,
          )}
          ref={contentRef}
          role="dialog"
          style={{ animation: "fade-in 0.15s ease-out, zoom-in-95 0.15s ease-out" }}
          tabIndex={-1}
          {...props}
        >
          {children}
          <button
            aria-label="Close"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={onClose}
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  );
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
