/** Configuration for creating an Arche SDK client. */
export interface ArcheConfig {
  /** Base URL of the Arche CMS server (e.g. `http://localhost:3000`). */
  baseUrl: string;
  /** JWT access token for authenticated requests. */
  token?: string;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
}

/** Options passed to individual HTTP requests, extending the standard `RequestInit`. */
export interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  /** URL query parameters to append to the request. */
  params: Record<string, string | number | boolean | undefined> | undefined;
}

/** Parameters for list/pagination endpoints. */
export interface ListParams {
  /** Maximum number of items to return. */
  limit?: number;
  /** Number of items to skip. */
  offset?: number;
  /** Sort order (e.g. `"createdAt"` or `"-createdAt"` for descending). */
  sort?: string;
  /** Fields to include in the response. */
  select?: string[];
  /** Related fields to populate. */
  populate?: string[];
  /** Locale to return content in (for localized collections). */
  locale?: string;
  /** Whether to include soft-deleted entries. */
  deleted?: boolean;
  /** Filter conditions (e.g. `{ status: "published" }`). */
  where?: Record<string, string | number | boolean>;
}

/** Paginated response from a list endpoint. */
export interface PaginatedResponse<T> {
  /** Array of items returned. */
  data: T[];
  /** Total number of items matching the query. */
  total: number;
}

/** Response from the login endpoint. */
export interface AuthResponse {
  /** Authenticated user info. */
  user: { id: string; email: string; role: string };
  /** Short-lived JWT access token. */
  accessToken: string;
  /** Long-lived refresh token for obtaining new access tokens. */
  refreshToken: string;
}

/** Response from the token refresh endpoint. */
export interface RefreshResponse {
  /** New access token. */
  accessToken: string;
  /** New refresh token (token rotation). */
  refreshToken: string;
}

/** A user account. */
export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/** A role with associated permissions. */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Array<{ action: string; resource: string }>;
  createdAt: string;
  updatedAt: string;
}

/** Metadata for a media file. */
export interface MediaMeta {
  id: string;
  /** Filename on disk. */
  filename: string;
  /** Original filename uploaded by the user. */
  originalName: string;
  mimeType: string;
  /** File size in bytes. */
  size: number;
  /** Alternative text for accessibility. */
  alt: string;
  /** ID of the folder this file belongs to, or `null` for root. */
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A folder in the media library. */
export interface MediaFolder {
  id: string;
  name: string;
  /** Parent folder ID, or `null` for root folders. */
  parentId: string | null;
  createdAt: string;
}

/** An audit log entry tracking a content mutation. */
export interface ActivityEntry {
  id: string;
  /** Action performed (e.g. `"create"`, `"update"`, `"delete"`). */
  action: string;
  /** Collection the mutation targeted. */
  collection: string;
  /** ID of the affected document. */
  documentId: string;
  /** Human-readable label for the entry. */
  label: string;
  createdAt: string;
}

/** Metadata for an API token. */
export interface ApiTokenMeta {
  id: string;
  name: string;
  /** Last four characters of the token (for display). */
  lastFour: string;
  description: string;
  /** Role assigned to the token. */
  role: string;
  createdAt: string;
  createdBy: string;
  /** When the token was last used, or `null` if never used. */
  lastUsedAt: string | null;
}

/** Response from creating an API token. The `rawToken` is only shown once. */
export interface ApiTokenCreateResponse {
  /** The full token value (shown once, cannot be retrieved later). */
  rawToken: string;
  /** Metadata for the created token. */
  token: ApiTokenMeta;
}

/** Configuration for a webhook. */
export interface WebhookMeta {
  id: string;
  name: string;
  /** URL to send HTTP requests to. */
  url: string;
  /** Events that trigger this webhook (e.g. `"collection.create"`). */
  events: string[];
  /** Collection this webhook is scoped to, or empty for global events. */
  collection: string;
  /** Whether the webhook is active. */
  enabled: boolean;
  /** Whether a signing secret is configured. */
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A versioned snapshot of a document. */
export interface Version {
  id: string;
  /** Version number (auto-incrementing). */
  version: number;
  /** Document data at this version. */
  data: Record<string, unknown>;
  /** ID of the document this version belongs to. */
  entryId: string;
  collection: string;
  createdAt: string;
}

/** Status of the initial setup process. */
export interface SetupStatus {
  /** Whether at least one admin user has been created. */
  hasAdmin: boolean;
}

/** Interceptor that can modify outgoing requests before they are sent. */
export interface RequestInterceptor {
  (
    config: ArcheConfig & { url: string; init: RequestInit },
  ):
    | (ArcheConfig & { url: string; init: RequestInit })
    | Promise<ArcheConfig & { url: string; init: RequestInit }>;
}

/** Interceptor that can modify incoming responses before they are returned. */
export interface ResponseInterceptor {
  (response: Response): Response | Promise<Response>;
}

/** Interceptor that can modify errors before they are thrown. */
export interface ErrorInterceptor {
  (error: Error): Error | Promise<Error>;
}

/** HTTP method supported by the Arche API. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
