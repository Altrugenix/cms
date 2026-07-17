import type { CMSContext } from "./core.js";
import type { FieldDefinition } from "./fields.js";

export interface PluginHooks {
  beforeSchemaLoad?: (context: CMSContext) => Promise<void>;
  afterSchemaLoad?: (context: CMSContext) => Promise<void>;
  beforeRequest?: (context: CMSContext, request: unknown) => Promise<void>;
  afterRequest?: (context: CMSContext, response: unknown) => Promise<void>;
  beforeRouteRegister?: (context: CMSContext) => Promise<void>;
  afterRouteRegister?: (context: CMSContext) => Promise<void>;
}

export interface PluginDefinition {
  slug: string;
  name: string;
  description?: string;
  version?: string;
  hooks?: PluginHooks;
  fields?: Record<string, FieldDefinition[]>;
  adminPanels?: Array<{
    slug: string;
    label: string;
    icon?: string;
    component: string;
  }>;
}

export interface PluginRegistration {
  plugin: PluginDefinition;
  enabled: boolean;
  config?: Record<string, unknown>;
}
