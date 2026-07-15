export type EventHandler<T = unknown> = (
  payload: T,
  context?: Record<string, unknown>,
) => void | Promise<void>;

export type Middleware = (
  event: string,
  payload: unknown,
  next: () => Promise<void>,
) => Promise<void>;

export interface EventBusOptions {
  middleware?: Middleware[];
}

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly middleware: Middleware[];

  constructor(options?: EventBusOptions) {
    this.middleware = options?.middleware ?? [];
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    let handlers = this.handlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(event, handlers);
    }
    handlers.add(handler as EventHandler);

    return () => {
      handlers?.delete(handler as EventHandler);
    };
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  async emit(event: string, payload?: unknown, context?: Record<string, unknown>): Promise<void> {
    const run = async () => {
      const handlers = this.handlers.get(event);
      if (!handlers) return;
      const promises = Array.from(handlers).map((h) =>
        (async () => {
          try {
            await h(payload, context);
          } catch {
            /* ignore handler errors */
          }
        })(),
      );
      await Promise.all(promises);
    };

    if (this.middleware.length > 0) {
      const chain: Array<
        (event: string, payload: unknown, next: () => Promise<void>) => Promise<void>
      > = [
        ...this.middleware,
        async () => {
          await run();
        },
      ];
      const execute = async (index: number): Promise<void> => {
        const fn = chain[index] as (
          event: string,
          payload: unknown,
          next: () => Promise<void>,
        ) => Promise<void>;
        if (index < chain.length - 1) {
          await fn(event, payload, () => execute(index + 1));
        } else {
          await fn(event, payload, async () => {});
        }
      };
      await execute(0);
    } else {
      await run();
    }
  }

  removeAll(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}
