export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
}

export interface LifecycleHooks {
  onInit?: (() => Promise<void>) | undefined;
  onReady?: (() => Promise<void>) | undefined;
  onShutdown?: (() => Promise<void>) | undefined;
}

export interface Config {
  port: number;
  host: string;
  database: {
    adapter: string;
    url: string;
  };
  auth: {
    secret: string;
    expiresIn: string;
  };
  storage: {
    adapter: string;
    baseDir: string;
  };
  plugins: Record<string, unknown>;
  [key: string]: unknown;
}

export type ConfigLoader = () => Promise<Config>;

export interface EventMap {
  "schema:loaded": { count: number };
  "schema:changed": { slug: string };
  "collection:created": { collection: string; id: string };
  "collection:updated": { collection: string; id: string };
  "collection:deleted": { collection: string; id: string };
  "auth:login": { userId: string };
  "auth:logout": { userId: string };
  "plugin:registered": { slug: string };
  "server:start": { port: number };
  "server:stop": Record<string, never>;
  "migration:run": { name: string };
  [key: string]: unknown;
}

export interface CMSContext {
  config: Config;
  logger: Logger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  container: any;
}
