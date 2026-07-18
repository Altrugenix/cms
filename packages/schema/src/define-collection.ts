import type { CollectionDefinition } from "@arche-cms/types";

export function defineCollection(config: CollectionDefinition): CollectionDefinition {
  const defaultTimestamps = { createdAt: true, updatedAt: true };
  return {
    ...config,
    timestamps:
      config.timestamps === false ? false : { ...defaultTimestamps, ...(config.timestamps ?? {}) },
  };
}
