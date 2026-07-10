import type { FieldDefinition } from "./fields.js";

export interface Labels {
  singular: string;
  plural: string;
}

export interface CollectionTimestamps {
  createdAt: boolean;
  updatedAt: boolean;
}

export interface CollectionDefinition {
  slug: string;
  labels: Labels;
  fields: FieldDefinition[];
  timestamps?: Partial<CollectionTimestamps>;
  auth?: boolean;
  admin?: {
    group?: string;
    defaultSort?: string;
    defaultPageSize?: number;
    hide?: boolean;
    description?: string;
    useAsTitle?: string;
  };
  versions?: {
    drafts: boolean;
    maxPerDoc?: number;
    softDelete?: boolean;
    scheduledPublishing?: boolean;
  };
  slugField?: {
    source?: string;
    unique?: boolean;
  };
  localization?: {
    locales: string[];
    defaultLocale: string;
  };
}

export interface GlobalDefinition {
  slug: string;
  label: string;
  fields: FieldDefinition[];
  admin?: {
    group?: string;
    description?: string;
    hide?: boolean;
  };
}

export interface ComponentDefinition {
  slug: string;
  label: string;
  fields: FieldDefinition[];
}
