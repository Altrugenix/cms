const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
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
  fields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
    to?: string;
  }>;
};

export async function fetchCollections(): Promise<CollectionMeta[]> {
  return apiFetch<CollectionMeta[]>("/api/collections");
}

export type UserMeta = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchUsers(): Promise<{ data: UserMeta[]; total: number }> {
  return apiFetch("/api/users");
}

export type RoleMeta = {
  id: string;
  name: string;
  description: string;
  permissions: Array<{ action: string; resource: string; fields?: string[] }>;
  createdAt: string;
  updatedAt: string;
};

export async function fetchRoles(): Promise<{ data: RoleMeta[]; total: number }> {
  return apiFetch("/api/roles");
}

export async function createRole(data: {
  name: string;
  description: string;
  permissions: Array<{ action: string; resource: string }>;
}): Promise<RoleMeta> {
  return apiFetch("/api/roles", { method: "POST", body: JSON.stringify(data) });
}

export async function updateRole(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    permissions: Array<{ action: string; resource: string }>;
  }>,
): Promise<RoleMeta> {
  return apiFetch(`/api/roles/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteRole(id: string): Promise<void> {
  await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
}

export async function updateUser(
  id: string,
  data: { email?: string; role?: string },
): Promise<UserMeta> {
  return apiFetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
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
  createdAt: string;
  updatedAt: string;
};

export async function fetchMedia(): Promise<{ data: MediaMeta[]; total: number }> {
  return apiFetch("/api/media");
}

export async function uploadMedia(file: File, alt?: string): Promise<MediaMeta> {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
  );
  return apiFetch("/api/media", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      data: base64,
      alt: alt ?? "",
    }),
  });
}

export async function deleteMedia(id: string): Promise<void> {
  await apiFetch(`/api/media/${id}`, { method: "DELETE" });
}

export function getMediaUrl(id: string): string {
  return `${API_URL}/api/media/file/${id}`;
}
