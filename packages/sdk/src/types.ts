export interface ArcheConfig {
  baseUrl: string;
  token?: string;
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  params: Record<string, string | number | boolean | undefined> | undefined;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  sort?: string;
  select?: string[];
  populate?: string[];
  locale?: string;
  deleted?: boolean;
  where?: Record<string, string | number | boolean>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface AuthResponse {
  user: { id: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Array<{ action: string; resource: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface MediaMeta {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  collection: string;
  documentId: string;
  label: string;
  createdAt: string;
}

export interface ApiTokenMeta {
  id: string;
  name: string;
  lastFour: string;
  description: string;
  role: string;
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
}

export interface ApiTokenCreateResponse {
  rawToken: string;
  token: ApiTokenMeta;
}

export interface WebhookMeta {
  id: string;
  name: string;
  url: string;
  events: string[];
  collection: string;
  enabled: boolean;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  id: string;
  version: number;
  data: Record<string, unknown>;
  entryId: string;
  collection: string;
  createdAt: string;
}

export interface SetupStatus {
  hasAdmin: boolean;
}

export interface RequestInterceptor {
  (
    config: ArcheConfig & { url: string; init: RequestInit },
  ):
    | (ArcheConfig & { url: string; init: RequestInit })
    | Promise<ArcheConfig & { url: string; init: RequestInit }>;
}

export interface ResponseInterceptor {
  (response: Response): Response | Promise<Response>;
}

export interface ErrorInterceptor {
  (error: Error): Error | Promise<Error>;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
