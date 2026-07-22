import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

export function Tooltip({ children, content, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), 400);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(false);
  }, []);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const positionClasses = {
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  } as const;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <div aria-describedby={open ? tooltipId : undefined} ref={triggerRef} tabIndex={0}>
        {children}
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
            positionClasses[side],
          )}
          id={tooltipId}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
