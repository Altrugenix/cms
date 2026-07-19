const API_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3000";

export type SchemaInfo = {
  slug: string;
  label: string;
  type: "collection" | "global" | "component";
  fields: FieldDefinition[];
  meta: Record<string, unknown>;
};

export type FieldDefinition = {
  name: string;
  type: string;
  label?: string;
  localized?: boolean;
  defaultValue?: unknown;
  validation?: Record<string, unknown>;
  admin?: Record<string, unknown>;
  options?: Array<{ label: string; value: string } | string>;
  to?: string;
  kind?: string;
  component?: string;
  repeatable?: boolean;
  components?: string[];
  fields?: FieldDefinition[];
  tabs?: Array<{ label: string; fields: FieldDefinition[] }>;
  source?: string;
  unique?: boolean;
  language?: string;
  format?: string;
  multiple?: boolean;
  allowedTypes?: string[];
};

export async function fetchSchemas(): Promise<SchemaInfo[]> {
  const res = await apiFetch<{ data: SchemaInfo[] }>("/api/schemas");
  return res.data;
}

export async function fetchSchema(type: string, slug: string): Promise<SchemaInfo> {
  return apiFetch(`/api/schemas/${type}/${slug}`);
}

export async function createSchema(
  type: string,
  data: {
    slug: string;
    fields?: FieldDefinition[];
    meta?: Record<string, unknown>;
    label?: string;
  },
): Promise<void> {
  await apiFetch(`/api/schemas/${type}`, {
    body: JSON.stringify(data),
    method: "POST",
  });
}

export async function saveSchema(
  type: string,
  slug: string,
  data: { fields?: FieldDefinition[]; meta?: Record<string, unknown>; label?: string },
): Promise<void> {
  await apiFetch(`/api/schemas/${type}/${slug}`, {
    body: JSON.stringify(data),
    method: "PUT",
  });
}

export async function bulkDelete(path: string, ids: string[]): Promise<void> {
  await apiFetch(`/api/${path}/bulk-delete`, {
    body: JSON.stringify({ ids }),
    method: "POST",
  });
}

export async function bulkPublish(path: string, ids: string[]): Promise<void> {
  await apiFetch(`/api/${path}/bulk-publish`, {
    body: JSON.stringify({ ids }),
    method: "POST",
  });
}

export async function bulkUnpublish(path: string, ids: string[]): Promise<void> {
  await apiFetch(`/api/${path}/bulk-unpublish`, {
    body: JSON.stringify({ ids }),
    method: "POST",
  });
}

export async function deleteSchema(type: string, slug: string): Promise<void> {
  await apiFetch(`/api/schemas/${type}/${slug}`, { method: "DELETE" });
}

export function getApiUrl(): string {
  return API_URL;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("cms_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    const refreshToken = localStorage.getItem("cms_refresh");
    if (refreshToken) {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
        body: JSON.stringify({ refreshToken }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (refreshRes.ok) {
        const data = (await refreshRes.json()) as { accessToken: string; refreshToken: string };
        localStorage.setItem("cms_token", data.accessToken);
        localStorage.setItem("cms_refresh", data.refreshToken);
        headers["Authorization"] = `Bearer ${data.accessToken}`;
        const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers });
        if (!retryRes.ok) {
          const errBody = (await retryRes.json().catch(() => ({}))) as {
            error?: string;
            details?: Array<{ path: (string | number)[]; message: string }>;
          };
          throw new ApiError(
            retryRes.status,
            errBody.error ?? `API error: ${retryRes.status}`,
            errBody.details,
          );
        }
        return retryRes.json() as Promise<T>;
      }
      logoutAndRedirect();
    }
    logoutAndRedirect();
  }
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: Array<{ path: (string | number)[]; message: string }>;
    };
    throw new ApiError(res.status, errBody.error ?? `API error: ${res.status}`, errBody.details);
  }
  return res.json() as Promise<T>;
}

function logoutAndRedirect(): never {
  localStorage.removeItem("cms_token");
  localStorage.removeItem("cms_refresh");
  localStorage.removeItem("cms_user");
  window.location.href = "/login";
  throw new Error("Session expired");
}

export class ApiError extends Error {
  status: number;
  details?: Array<{ path: (string | number)[]; message: string }>;

  constructor(
    status: number,
    message: string,
    details?: Array<{ path: (string | number)[]; message: string }>,
  ) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export type CollectionMeta = {
  slug: string;
  label: string;
  labels: { singular?: string; plural?: string };
  versions?: { drafts?: boolean; softDelete?: boolean };
  localization?: { locales: string[]; defaultLocale: string };
  fields: FieldDefinition[];
};

export type GlobalMeta = {
  slug: string;
  label: string;
  fields: FieldDefinition[];
};

export async function fetchCollections(): Promise<CollectionMeta[]> {
  return apiFetch<CollectionMeta[]>("/api/collections");
}

export async function fetchGlobals(): Promise<GlobalMeta[]> {
  return apiFetch<GlobalMeta[]>("/api/globals");
}

export async function fetchGlobal(slug: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/globals/${slug}`);
}

export async function saveGlobal(
  slug: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/globals/${slug}`, {
    body: JSON.stringify(data),
    method: "PUT",
  });
}

export type UserMeta = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchUsers(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: UserMeta[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return apiFetch(`/api/users${qs ? `?${qs}` : ""}`);
}

export type RoleMeta = {
  id: string;
  name: string;
  description: string;
  permissions: Array<{ action: string; resource: string; fields?: string[] }>;
  createdAt: string;
  updatedAt: string;
};

export async function fetchRoles(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: RoleMeta[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return apiFetch(`/api/roles${qs ? `?${qs}` : ""}`);
}

export async function createRole(data: {
  name: string;
  description: string;
  permissions: Array<{ action: string; resource: string }>;
}): Promise<RoleMeta> {
  return apiFetch("/api/roles", { body: JSON.stringify(data), method: "POST" });
}

export async function updateRole(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    permissions: Array<{ action: string; resource: string }>;
  }>,
): Promise<RoleMeta> {
  return apiFetch(`/api/roles/${id}`, { body: JSON.stringify(data), method: "PATCH" });
}

export async function deleteRole(id: string): Promise<void> {
  await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
}

export async function createUser(email: string, password: string): Promise<void> {
  await apiFetch("/api/users", {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });
}

export async function updateUser(
  id: string,
  data: { email?: string; role?: string; password?: string },
): Promise<UserMeta> {
  return apiFetch(`/api/users/${id}`, { body: JSON.stringify(data), method: "PATCH" });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch(`/api/users/${id}`, { method: "DELETE" });
}

export type MediaMeta = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: string;
  folderId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MediaFolder = {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
};

export async function fetchMedia(
  folderId?: string | null,
  params?: { limit?: number; offset?: number },
): Promise<{ data: MediaMeta[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams();
  if (folderId) {
    searchParams.set("folderId", folderId);
  } else if (folderId === null) {
    searchParams.set("folderId", "null");
  }
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return apiFetch(`/api/media${qs ? `?${qs}` : ""}`);
}

export async function uploadMedia(
  file: File,
  alt?: string,
  folderId?: string | null,
): Promise<MediaMeta> {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
  );
  const body: Record<string, unknown> = {
    alt: alt ?? "",
    data: base64,
    fileName: file.name,
    mimeType: file.type,
  };
  if (folderId !== undefined) {
    body.folderId = folderId;
  }
  return apiFetch("/api/media", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

export async function updateMedia(
  id: string,
  updates: { originalName?: string; alt?: string; folderId?: string | null },
): Promise<MediaMeta> {
  return apiFetch(`/api/media/${id}`, {
    body: JSON.stringify(updates),
    method: "PATCH",
  });
}

export async function fetchFolders(
  parentId?: string | null,
): Promise<{ data: MediaFolder[]; total: number }> {
  let path = "/api/media/folders";
  if (parentId) {
    path += `?parentId=${parentId}`;
  } else if (parentId === null) {
    path += "?parentId=null";
  }
  return apiFetch(path);
}

export async function fetchFolder(id: number): Promise<MediaFolder> {
  return apiFetch(`/api/media/folders/${id}`);
}

export async function createFolder(name: string, parentId?: number | null): Promise<MediaFolder> {
  const body: Record<string, unknown> = { name };
  if (parentId !== undefined) {
    body.parentId = parentId;
  }
  return apiFetch("/api/media/folders", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

export async function updateFolder(
  id: number,
  data: { name?: string; parentId?: number | null },
): Promise<MediaFolder> {
  return apiFetch(`/api/media/folders/${id}`, {
    body: JSON.stringify(data),
    method: "PATCH",
  });
}

export async function deleteFolder(id: number): Promise<void> {
  await apiFetch(`/api/media/folders/${id}`, { method: "DELETE" });
}

export async function deleteMedia(id: string): Promise<void> {
  await apiFetch(`/api/media/${id}`, { method: "DELETE" });
}

export function getMediaUrl(id: string): string {
  return `${API_URL}/api/media/file/${id}`;
}

export type ActivityEntry = {
  id: string;
  action: "create" | "update" | "delete" | "bulkDelete" | "upsert";
  collection: string;
  documentId: string | null;
  label: string;
  createdAt: string;
};

export async function fetchActivity(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: ActivityEntry[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return apiFetch(`/api/activity${qs ? `?${qs}` : ""}`);
}

export type ApiTokenMeta = {
  id: string;
  name: string;
  lastFour: string;
  description: string;
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
};

export async function fetchApiTokens(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: ApiTokenMeta[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return apiFetch(`/api/settings/api-tokens${qs ? `?${qs}` : ""}`);
}

export async function createApiToken(data: {
  name: string;
  description?: string;
}): Promise<{ token: ApiTokenMeta; rawToken: string }> {
  return apiFetch("/api/settings/api-tokens", {
    body: JSON.stringify(data),
    method: "POST",
  });
}

export async function deleteApiToken(id: string): Promise<void> {
  await apiFetch(`/api/settings/api-tokens/${id}`, { method: "DELETE" });
}

export type WebhookMeta = {
  id: string;
  name: string;
  url: string;
  events: string[];
  collection: string;
  enabled: boolean;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchWebhooks(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ data: WebhookMeta[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  return apiFetch(`/api/settings/webhooks${qs ? `?${qs}` : ""}`);
}

export async function fetchWebhook(id: string): Promise<WebhookMeta> {
  return apiFetch(`/api/settings/webhooks/${id}`);
}

export async function createWebhook(data: {
  name: string;
  url: string;
  events: string[];
  collection?: string;
  secret?: string;
}): Promise<WebhookMeta> {
  return apiFetch("/api/settings/webhooks", {
    body: JSON.stringify(data),
    method: "POST",
  });
}

export async function updateWebhook(
  id: string,
  data: Partial<{
    name: string;
    url: string;
    events: string[];
    collection: string;
    enabled: boolean;
    secret: string;
  }>,
): Promise<WebhookMeta> {
  return apiFetch(`/api/settings/webhooks/${id}`, {
    body: JSON.stringify(data),
    method: "PUT",
  });
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiFetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
}

export type PluginMeta = {
  plugin: {
    slug: string;
    name: string;
    description?: string;
    version?: string;
  };
  enabled: boolean;
};

export async function fetchPlugins(): Promise<{ data: PluginMeta[]; total: number }> {
  return apiFetch("/api/plugins");
}

export type VersionMeta = {
  id: string;
  collection: string;
  entryId: string;
  version: number;
  data: string;
  createdAt: string;
};

export async function fetchVersions(
  slug: string,
  entryId: string,
): Promise<{ data: VersionMeta[]; total: number }> {
  return apiFetch(`/api/${slug}/${entryId}/versions`);
}

export async function restoreVersion(
  slug: string,
  entryId: string,
  versionId: string,
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/${slug}/${entryId}/versions/${versionId}/restore`, {
    method: "POST",
  });
}
