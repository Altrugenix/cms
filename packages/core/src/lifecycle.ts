export type LifecycleState = "init" | "ready" | "shutdown";

export interface LifecycleOptions {
  onInit?: (() => Promise<void>) | undefined;
  onReady?: (() => Promise<void>) | undefined;
  onShutdown?: (() => Promise<void>) | undefined;
}

export class Lifecycle {
  private state: LifecycleState = "init";
  private readonly hooks: {
    init: Array<() => Promise<void>>;
    ready: Array<() => Promise<void>>;
    shutdown: Array<() => Promise<void>>;
  };

  constructor(options?: LifecycleOptions) {
    this.hooks = {
      init: options?.onInit ? [options.onInit] : [],
      ready: options?.onReady ? [options.onReady] : [],
      shutdown: options?.onShutdown ? [options.onShutdown] : [],
    };
  }

  get currentState(): LifecycleState {
    return this.state;
  }

  onInit(hook: () => Promise<void>): void {
    this.hooks.init.push(hook);
  }

  onReady(hook: () => Promise<void>): void {
    this.hooks.ready.push(hook);
  }

  onShutdown(hook: () => Promise<void>): void {
    this.hooks.shutdown.push(hook);
  }

  async init(): Promise<void> {
    if (this.state !== "init") {
      throw new Error(`Cannot init from state: ${this.state}`);
    }
    for (const hook of this.hooks.init) {
      await hook();
    }
    this.state = "ready";
  }

  async ready(): Promise<void> {
    if (this.state !== "ready") {
      throw new Error(`Cannot ready from state: ${this.state}`);
    }
    for (const hook of this.hooks.ready) {
      await hook();
    }
  }

  async shutdown(): Promise<void> {
    if (this.state === "shutdown") return;
    const prev = this.state;
    this.state = "shutdown";
    for (const hook of this.hooks.shutdown) {
      await hook();
    }
    if (prev !== "ready") {
      throw new Error(`Shutdown from unexpected state: ${prev}`);
    }
  }
}
