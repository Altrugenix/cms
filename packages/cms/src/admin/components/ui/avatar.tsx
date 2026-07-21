import { useState, type ImgHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AvatarProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: string;
};

export function Avatar({ alt, className, fallback, src, ...props }: AvatarProps) {
  const [hasError, setHasError] = useState(!src);

  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}>
      {src && !hasError ? (
        <img
          alt={alt ?? ""}
          className="aspect-square h-full w-full"
          onError={() => setHasError(true)}
          src={src}
          {...props}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
          {fallback ?? "?"}
        </div>
      )}
    </div>
  );
}
