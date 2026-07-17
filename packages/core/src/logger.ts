import type { Logger } from "@arche-cms/types";

export interface LoggerOptions {
  level?: "debug" | "info" | "warn" | "error" | "fatal";
  prefix?: string;
}

const levels = { debug: 0, error: 3, fatal: 4, info: 1, warn: 2 } as const;

export function createLogger(options?: LoggerOptions): Logger {
  const minLevel = levels[options?.level ?? "info"];
  const prefix = options?.prefix ?? "cms";

  const log =
    (level: keyof typeof levels) =>
    (...args: unknown[]): void => {
      if (levels[level] < minLevel) return;
      const timestamp = new Date().toISOString();
      const msg = args
        .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
        .join(" ");
      // eslint-disable-next-line no-console
      console[level === "fatal" ? "error" : level](
        `[${timestamp}] [${prefix}] [${level.toUpperCase()}] ${msg}`,
      );
    };

  return {
    debug: log("debug"),
    error: log("error"),
    fatal: log("fatal"),
    info: log("info"),
    warn: log("warn"),
  };
}
