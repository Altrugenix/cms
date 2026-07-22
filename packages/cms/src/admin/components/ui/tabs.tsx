import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  onValueChange: (value: string) => void;
  value: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

type TabsProps = HTMLAttributes<HTMLDivElement> & {
  defaultValue: string;
  onValueChange?: (value: string) => void;
  value?: string;
};

export function Tabs({
  className,
  defaultValue,
  onValueChange,
  value: controlledValue,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleValueChange = useCallback(
    (v: string) => {
      setInternalValue(v);
      onValueChange?.(v);
    },
    [onValueChange],
  );

  const ctx = useMemo(
    () => ({ onValueChange: handleValueChange, value }),
    [handleValueChange, value],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div data-orientation="horizontal" className={cn("", className)} {...props} />
    </TabsContext.Provider>
  );
}

type TabsListProps = HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className,
      )}
      role="tablist"
      {...props}
    />
  );
}

type TabsTriggerProps = HTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({ className, value: triggerValue, ...props }: TabsTriggerProps) {
  const { onValueChange, value } = useTabsContext();
  const isActive = value === triggerValue;

  return (
    <button
      aria-selected={isActive}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-background text-foreground shadow-sm",
        className,
      )}
      onClick={() => onValueChange(triggerValue)}
      role="tab"
      tabIndex={isActive ? 0 : -1}
      type="button"
      {...props}
    />
  );
}

type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ className, value: contentValue, ...props }: TabsContentProps) {
  const { value } = useTabsContext();
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(value === contentValue);
  const isActive = value === contentValue;

  useEffect(() => {
    if (isActive) setShouldRender(true);
  }, [isActive]);

  useEffect(() => {
    if (!shouldRender || !ref.current) return;
    ref.current.hidden = !isActive;
  }, [isActive, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      ref={ref}
      role="tabpanel"
      tabIndex={0}
      {...props}
    />
  );
}
