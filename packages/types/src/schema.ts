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
  timestamps?: Partial<CollectionTimestamps> | false | undefined;
  auth?: boolean | undefined;
  admin?:
    | {
        group?: string | undefined;
        defaultSort?: string | undefined;
        defaultPageSize?: number | undefined;
        hide?: boolean | undefined;
        description?: string | undefined;
        useAsTitle?: string | undefined;
      }
    | undefined;
  versions?:
    | {
        drafts: boolean;
        maxPerDoc?: number | undefined;
        softDelete?: boolean | undefined;
        scheduledPublishing?: boolean | undefined;
      }
    | undefined;
  slugField?:
    | {
        source?: string | undefined;
        unique?: boolean | undefined;
      }
    | undefined;
  localization?:
    | {
        locales: string[];
        defaultLocale: string;
      }
    | undefined;
}

export interface GlobalDefinition {
  slug: string;
  label: string;
  fields: FieldDefinition[];
  admin?:
    | {
        group?: string | undefined;
        description?: string | undefined;
        hide?: boolean | undefined;
      }
    | undefined;
}

export interface ComponentDefinition {
  slug: string;
  label: string;
  fields: FieldDefinition[];
}
