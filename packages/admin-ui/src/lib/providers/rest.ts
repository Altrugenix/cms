import type { AdminProvider, AdminUser, MediaFolder } from "./types";

function storageGet(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function storageSet(key: string, value: string, persistent: boolean) {
  const store = persistent ? localStorage : sessionStorage;
  store.setItem(key, value);
}

function storageRemove(key: string) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

const API_URL: string = (import.meta.env.VITE_API_URL as string) || "http://localhost:3500";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = storageGet("cms_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    if (await tryRefreshToken(headers)) {
      return fetchWithHeaders<T>(path, options, headers);
    }
    logoutAndRedirect();
  }
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error ?? `API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function tryRefreshToken(headers: Record<string, string>): Promise<boolean> {
  const refreshToken = storageGet("cms_refresh");
  if (!refreshToken) return false;
  const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
    body: JSON.stringify({ refreshToken }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!refreshRes.ok) return false;
  const data = (await refreshRes.json()) as { accessToken: string; refreshToken: string };
  const persistent = !!localStorage.getItem("cms_token");
  storageSet("cms_token", data.accessToken, persistent);
  storageSet("cms_refresh", data.refreshToken, persistent);
  headers["Authorization"] = `Bearer ${data.accessToken}`;
  return true;
}

async function fetchWithHeaders<T>(
  path: string,
  options: RequestInit,
  headers: Record<string, string>,
): Promise<T> {
  const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!retryRes.ok) {
    const errBody = (await retryRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error ?? `API error: ${retryRes.status}`);
  }
  return retryRes.json() as Promise<T>;
}

function logoutAndRedirect(): never {
  storageRemove("cms_token");
  storageRemove("cms_refresh");
  storageRemove("cms_user");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (globalThis as Record<string, unknown> & { location: Location }).location.href = "/login";
  throw new Error("Session expired");
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function authResult(data: { user: AdminUser; accessToken: string; refreshToken: string }) {
  storageSet("cms_user", JSON.stringify(data.user), false);
  storageSet("cms_token", data.accessToken, false);
  storageSet("cms_refresh", data.refreshToken, false);
  return data.user;
}

export function createRestProvider(): AdminProvider {
  return {
    activity: {
      async listActivity(params) {
        return apiFetch(
          `/api/activity${buildQuery({ limit: params?.limit, offset: params?.offset })}`,
        );
      },
    },
    auth: {
      async forgotPassword(email) {
        await apiFetch("/api/auth/forgot-password", {
          body: JSON.stringify({ email }),
          method: "POST",
        });
      },
      async getCurrentUser() {
        if (!storageGet("cms_token")) return null;
        try {
          return await apiFetch<AdminUser>("/api/auth/me");
        } catch {
          return null;
        }
      },
      async login(email, password) {
        const data = await apiFetch<{ user: AdminUser; accessToken: string; refreshToken: string }>(
          "/api/auth/login",
          { body: JSON.stringify({ email, password }), method: "POST" },
        );
        return authResult(data);
      },
      async logout() {
        storageRemove("cms_token");
        storageRemove("cms_refresh");
        storageRemove("cms_user");
      },
      async register(email, password, name) {
        const data = await apiFetch<{ user: AdminUser; accessToken: string; refreshToken: string }>(
          "/api/auth/register",
          { body: JSON.stringify({ email, name, password }), method: "POST" },
        );
        return authResult(data);
      },
      async resetPassword(token, password) {
        await apiFetch("/api/auth/reset-password", {
          body: JSON.stringify({ password, token }),
          method: "POST",
        });
      },
    },
    collections: {
      async bulkDelete(slug, ids) {
        await apiFetch(`/api/${slug}/bulk-delete`, {
          body: JSON.stringify({ ids }),
          method: "POST",
        });
      },
      async createEntry(slug, data) {
        return apiFetch(`/api/${slug}`, { body: JSON.stringify(data), method: "POST" });
      },
      async deleteEntry(slug, id) {
        await apiFetch(`/api/${slug}/${id}`, { method: "DELETE" });
      },
      async getEntry(slug, id, locale) {
        return apiFetch(`/api/${slug}/${id}${locale ? `?locale=${locale}` : ""}`);
      },
      async listEntries(slug, params) {
        return apiFetch(
          `/api/${slug}${buildQuery({ limit: params?.limit, locale: params?.locale, offset: params?.offset })}`,
        );
      },
      async publishEntry(slug, id) {
        await apiFetch(`/api/${slug}/${id}/publish`, { method: "POST" });
      },
      async restoreEntry(slug, id) {
        await apiFetch(`/api/${slug}/${id}/restore`, { method: "POST" });
      },
      async unpublishEntry(slug, id) {
        await apiFetch(`/api/${slug}/${id}/unpublish`, { method: "POST" });
      },
      async updateEntry(slug, id, data) {
        return apiFetch(`/api/${slug}/${id}`, { body: JSON.stringify(data), method: "PATCH" });
      },
    },
    globals: {
      async getGlobal(slug) {
        return apiFetch(`/api/globals/${slug}`);
      },
      async upsertGlobal(slug, data) {
        return apiFetch(`/api/globals/${slug}`, { body: JSON.stringify(data), method: "PUT" });
      },
    },
    media: {
      async createFolder(name, parentId) {
        const body: Record<string, unknown> = { name };
        if (parentId !== undefined) body.parentId = parentId;
        return apiFetch("/api/media/folders", { body: JSON.stringify(body), method: "POST" });
      },
      async deleteFolder(id) {
        await apiFetch(`/api/media/folders/${id}`, { method: "DELETE" });
      },
      async deleteMedia(id) {
        await apiFetch(`/api/media/${id}`, { method: "DELETE" });
      },
      async getMedia(id) {
        return apiFetch(`/api/media/${id}`);
      },
      async getMediaFile(id) {
        return `${API_URL}/api/media/file/${id}`;
      },
      async listFolders() {
        const res = await apiFetch<{ data: MediaFolder[] }>("/api/media/folders");
        return res.data;
      },
      async listMedia(params) {
        return apiFetch(
          `/api/media${buildQuery({ limit: params?.limit, offset: params?.offset })}`,
        );
      },
      async renameFolder(id, name) {
        await apiFetch(`/api/media/folders/${id}`, {
          body: JSON.stringify({ name }),
          method: "PATCH",
        });
      },
      async uploadMedia(file, folderId) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""),
        );
        const body: Record<string, unknown> = {
          alt: "",
          data: base64,
          fileName: file.name,
          mimeType: file.type,
        };
        if (folderId !== undefined) body.folderId = folderId;
        return apiFetch("/api/media", { body: JSON.stringify(body), method: "POST" });
      },
    },
    roles: {
      async createRole(data) {
        return apiFetch("/api/roles", { body: JSON.stringify(data), method: "POST" });
      },
      async deleteRole(id) {
        await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
      },
      async getRole(id) {
        return apiFetch(`/api/roles/${id}`);
      },
      async listRoles(params) {
        return apiFetch(
          `/api/roles${buildQuery({ limit: params?.limit, offset: params?.offset })}`,
        );
      },
      async updateRole(id, data) {
        return apiFetch(`/api/roles/${id}`, { body: JSON.stringify(data), method: "PATCH" });
      },
    },
    settings: {
      async createApiToken(data) {
        return apiFetch("/api/settings/api-tokens", {
          body: JSON.stringify(data),
          method: "POST",
        });
      },
      async createWebhook(data) {
        return apiFetch("/api/settings/webhooks", {
          body: JSON.stringify(data),
          method: "POST",
        });
      },
      async deleteApiToken(id) {
        await apiFetch(`/api/settings/api-tokens/${id}`, { method: "DELETE" });
      },
      async deleteWebhook(id) {
        await apiFetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
      },
      async getWebhook(id) {
        return apiFetch(`/api/settings/webhooks/${id}`);
      },
      async listApiTokens(params) {
        return apiFetch(
          `/api/settings/api-tokens${buildQuery({ limit: params?.limit, offset: params?.offset })}`,
        );
      },
      async listWebhooks(params) {
        return apiFetch(
          `/api/settings/webhooks${buildQuery({ limit: params?.limit, offset: params?.offset })}`,
        );
      },
      async updateWebhook(id, data) {
        return apiFetch(`/api/settings/webhooks/${id}`, {
          body: JSON.stringify(data),
          method: "PUT",
        });
      },
    },
    users: {
      async createUser(data) {
        return apiFetch("/api/users", { body: JSON.stringify(data), method: "POST" });
      },
      async deleteUser(id) {
        await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      },
      async getUser(id) {
        return apiFetch(`/api/users/${id}`);
      },
      async listUsers(params) {
        return apiFetch(
          `/api/users${buildQuery({ limit: params?.limit, offset: params?.offset })}`,
        );
      },
      async updateUser(id, data) {
        return apiFetch(`/api/users/${id}`, { body: JSON.stringify(data), method: "PATCH" });
      },
    },
  };
}
