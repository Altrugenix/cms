import type { CMSContext } from "./core.js";
import type { FieldDefinition } from "./fields.js";

export interface PluginHooks {
  beforeSchemaLoad?: ((context: CMSContext) => Promise<void>) | undefined;
  afterSchemaLoad?: ((context: CMSContext) => Promise<void>) | undefined;
  beforeRequest?: ((context: CMSContext, request: unknown) => Promise<void>) | undefined;
  afterRequest?: ((context: CMSContext, response: unknown) => Promise<void>) | undefined;
  beforeRouteRegister?: ((context: CMSContext) => Promise<void>) | undefined;
  afterRouteRegister?: ((context: CMSContext) => Promise<void>) | undefined;
}

export interface PluginDefinition {
  slug: string;
  name: string;
  description?: string | undefined;
  version?: string | undefined;
  hooks?: PluginHooks | undefined;
  fields?: Record<string, FieldDefinition[]> | undefined;
  adminPanels?:
    | Array<{
        slug: string;
        label: string;
        icon?: string | undefined;
        component: string;
      }>
    | undefined;
}

export interface PluginRegistration {
  plugin: PluginDefinition;
  enabled: boolean;
  config?: Record<string, unknown> | undefined;
}
