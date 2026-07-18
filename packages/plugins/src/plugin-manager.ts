import type { PluginDefinition, PluginRegistration, CMSContext } from "@arche-cms/types";

export interface PluginManagerOptions {
  eventBus: {
    emit(event: string, payload?: unknown): void;
  };
  lifecycle: {
    onShutdown(hook: () => Promise<void>): void;
  };
  context: CMSContext;
}

export class PluginManager {
  private readonly registrations = new Map<string, PluginRegistration>();
  private readonly eventBus: PluginManagerOptions["eventBus"];
  private readonly lifecycle: PluginManagerOptions["lifecycle"];
  private readonly context: CMSContext;

  constructor(options: PluginManagerOptions) {
    this.eventBus = options.eventBus;
    this.lifecycle = options.lifecycle;
    this.context = options.context;
  }

  register(plugin: PluginDefinition, config?: Record<string, unknown>): void {
    if (this.registrations.has(plugin.slug)) {
      throw new Error(`Plugin "${plugin.slug}" is already registered`);
    }

    const registration: PluginRegistration = {
      config,
      enabled: true,
      plugin,
    };

    this.registrations.set(plugin.slug, registration);
    this.lifecycle.onShutdown(async () => {
      this.registrations.delete(plugin.slug);
    });
    this.eventBus.emit("plugin:registered", { slug: plugin.slug });
  }

  unregister(slug: string): void {
    this.registrations.delete(slug);
  }

  get(slug: string): PluginRegistration | undefined {
    return this.registrations.get(slug);
  }

  getAll(): PluginRegistration[] {
    return Array.from(this.registrations.values());
  }

  getEnabled(): PluginRegistration[] {
    return this.getAll().filter((r) => r.enabled);
  }

  enable(slug: string): void {
    const reg = this.registrations.get(slug);
    if (reg) reg.enabled = true;
  }

  disable(slug: string): void {
    const reg = this.registrations.get(slug);
    if (reg) reg.enabled = false;
  }

  async runHook(hookName: "beforeSchemaLoad" | "afterSchemaLoad"): Promise<void> {
    for (const reg of this.getEnabled()) {
      const hook = reg.plugin.hooks?.[hookName];
      if (hook) {
        try {
          await hook(this.context);
        } catch (e) {
          console.error(`Plugin hook error [${reg.plugin.slug}][${hookName}]:`, e);
        }
      }
    }
  }

  async runRequestHook(
    hookName: "beforeRequest" | "afterRequest",
    requestOrResponse: unknown,
  ): Promise<void> {
    for (const reg of this.getEnabled()) {
      const hook = reg.plugin.hooks?.[hookName];
      if (hook) {
        try {
          await hook(this.context, requestOrResponse);
        } catch (e) {
          console.error(`Plugin hook error [${reg.plugin.slug}][${hookName}]:`, e);
        }
      }
    }
  }

  async runRouteHook(hookName: "beforeRouteRegister" | "afterRouteRegister"): Promise<void> {
    for (const reg of this.getEnabled()) {
      const hook = reg.plugin.hooks?.[hookName];
      if (hook) {
        try {
          await hook(this.context);
        } catch (e) {
          console.error(`Plugin hook error [${reg.plugin.slug}][${hookName}]:`, e);
        }
      }
    }
  }

  getCustomFields(): Record<string, unknown[]> {
    const result: Record<string, unknown[]> = {};
    for (const reg of this.getEnabled()) {
      if (reg.plugin.fields) {
        for (const [key, fields] of Object.entries(reg.plugin.fields)) {
          if (!result[key]) result[key] = [];
          result[key].push(...fields);
        }
      }
    }
    return result;
  }

  getAdminPanels(): Array<{
    slug: string;
    label: string;
    icon?: string | undefined;
    component: string;
    plugin: string;
  }> {
    const panels: Array<{
      slug: string;
      label: string;
      icon?: string | undefined;
      component: string;
      plugin: string;
    }> = [];
    for (const reg of this.getEnabled()) {
      if (reg.plugin.adminPanels) {
        for (const panel of reg.plugin.adminPanels) {
          panels.push({ ...panel, plugin: reg.plugin.slug });
        }
      }
    }
    return panels;
  }

  async initPlugins(): Promise<void> {
    await this.runHook("beforeSchemaLoad");
  }
}
