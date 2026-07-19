import type { HttpClient } from "./client.js";
import type { MediaMeta, MediaFolder, PaginatedResponse } from "./types.js";

export interface MediaUploadData {
  fileName: string;
  mimeType: string;
  data: string;
  alt?: string;
  folderId?: string;
}

export interface MediaClient {
  list(params?: {
    limit?: number;
    offset?: number;
    folderId?: string;
  }): Promise<PaginatedResponse<MediaMeta>>;
  get(id: string): Promise<MediaMeta>;
  upload(data: MediaUploadData): Promise<MediaMeta>;
  update(
    id: string,
    data: { originalName?: string; alt?: string; folderId?: string },
  ): Promise<MediaMeta>;
  delete(id: string): Promise<{ message: string }>;
  getFile(id: string): Promise<Response>;
  folders: MediaFoldersClient;
}

export interface MediaFoldersClient {
  list(params?: {
    limit?: number;
    offset?: number;
    parentId?: string;
  }): Promise<PaginatedResponse<MediaFolder>>;
  get(id: string): Promise<MediaFolder>;
  create(data: { name: string; parentId?: string }): Promise<MediaFolder>;
  update(id: string, data: { name?: string; parentId?: string }): Promise<MediaFolder>;
  delete(id: string): Promise<{ message: string }>;
}

function createMediaFoldersClient(http: HttpClient): MediaFoldersClient {
  const base = "/api/media/folders";

  return {
    create(data) {
      return http.request("POST", base, data);
    },
    delete(id) {
      return http.request("DELETE", `${base}/${id}`);
    },
    get(id) {
      return http.request("GET", `${base}/${id}`);
    },
    list(params) {
      const query: Record<string, string | number | undefined> = {};
      if (params?.limit !== undefined) query.limit = params.limit;
      if (params?.offset !== undefined) query.offset = params.offset;
      if (params?.parentId !== undefined) query.parentId = params.parentId;
      return http.request("GET", base, undefined, {
        params: Object.keys(query).length ? query : undefined,
      });
    },
    update(id, data) {
      return http.request("PATCH", `${base}/${id}`, data);
    },
  };
}

export function createMediaClient(http: HttpClient): MediaClient {
  const base = "/api/media";

  return {
    delete(id) {
      return http.request("DELETE", `${base}/${id}`);
    },
    folders: createMediaFoldersClient(http),
    get(id) {
      return http.request("GET", `${base}/${id}`);
    },
    getFile(id) {
      return fetch(`${base}/file/${id}`, {
        headers: {
          Authorization: `Bearer ${(http as unknown as { getToken(): string | undefined }).getToken()}`,
        },
      });
    },
    list(params) {
      const query: Record<string, string | number | undefined> = {};
      if (params?.limit !== undefined) query.limit = params.limit;
      if (params?.offset !== undefined) query.offset = params.offset;
      if (params?.folderId !== undefined) query.folderId = params.folderId;
      return http.request("GET", base, undefined, {
        params: Object.keys(query).length ? query : undefined,
      });
    },
    update(id, data) {
      return http.request("PATCH", `${base}/${id}`, data);
    },
    upload(data) {
      return http.request("POST", base, data);
    },
  };
}
