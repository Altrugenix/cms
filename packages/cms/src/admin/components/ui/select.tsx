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

type SelectContextValue = {
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  open: boolean;
  value?: string;
};

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within <Select>");
  return ctx;
}

type SelectProps = {
  children: ReactNode;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  value?: string;
};

export function Select({
  children,
  defaultValue,
  disabled,
  onValueChange,
  value: controlledValue,
}: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const value = controlledValue ?? internalValue;

  const handleValueChange = useCallback(
    (v: string) => {
      setInternalValue(v);
      onValueChange?.(v);
      setOpen(false);
    },
    [onValueChange],
  );

  const ctx = useMemo<SelectContextValue>(
    () => ({
      ...(disabled !== undefined && { disabled }),
      onOpenChange: setOpen,
      onValueChange: handleValueChange,
      open,
      value,
    }),
    [disabled, handleValueChange, open, value],
  );

  return <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLButtonElement>) {
  const { disabled, onOpenChange, open } = useSelectContext();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOpenChange, open]);

  return (
    <button
      aria-expanded={open}
      aria-haspopup="listbox"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      disabled={disabled}
      onClick={() => onOpenChange(!open)}
      ref={ref}
      role="combobox"
      type="button"
      {...props}
    >
      {children}
      <svg
        aria-hidden="true"
        className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function SelectValue({
  className,
  placeholder,
}: {
  className?: string;
  placeholder?: string;
}) {
  const { value } = useSelectContext();
  return (
    <span className={cn(!value && "text-muted-foreground", className)}>
      {value || placeholder || "Select..."}
    </span>
  );
}

export function SelectContent({
  children,
  className,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { open } = useSelectContext();
  if (!open) return null;

  return (
    <div
      className={cn(
        "relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        className,
      )}
      role="listbox"
      style={{ animation: "fade-in 0.15s ease-out, zoom-in-95 0.15s ease-out" }}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

export function SelectItem({
  children,
  className,
  value: itemValue,
}: {
  children: ReactNode;
  className?: string;
  value: string;
}) {
  const { onValueChange, value } = useSelectContext();
  const isSelected = value === itemValue;

  return (
    <div
      aria-selected={isSelected}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        className,
      )}
      onClick={() => onValueChange(itemValue)}
      role="option"
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {children}
    </div>
  );
}
