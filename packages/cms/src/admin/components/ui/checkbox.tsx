import { forwardRef, useId, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <input
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-primary text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        id={id}
        ref={ref}
        type="checkbox"
        {...props}
      />
    );
  },
);
Checkbox.displayName = "Checkbox";
