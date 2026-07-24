import type { HttpClient } from "./client.js";
import type { MediaMeta, MediaFolder, PaginatedResponse } from "./types.js";

/** Payload for uploading a media file. */
export interface MediaUploadData {
  /** Original filename (e.g. `"photo.jpg"`). */
  fileName: string;
  /** MIME type (e.g. `"image/jpeg"`). */
  mimeType: string;
  /** File contents as a base64-encoded string. */
  data: string;
  /** Alternative text for accessibility. */
  alt?: string;
  /** Folder ID to upload into. Omit for root folder. */
  folderId?: string;
}

/** Client for media file operations. */
export interface MediaClient {
  /**
   * List media files with optional pagination and folder filtering.
   */
  list(params?: {
    limit?: number;
    offset?: number;
    /** Filter by folder ID. */
    folderId?: string;
  }): Promise<PaginatedResponse<MediaMeta>>;
  /**
   * Get metadata for a single media file.
   *
   * @param id - Media file ID
   */
  get(id: string): Promise<MediaMeta>;
  /**
   * Upload a media file.
   *
   * @param data - File data (base64-encoded)
   * @returns Metadata for the uploaded file
   */
  upload(data: MediaUploadData): Promise<MediaMeta>;
  /**
   * Update media file metadata (name, alt text, folder).
   *
   * @param id - Media file ID
   * @param data - Fields to update
   */
  update(
    id: string,
    data: { originalName?: string; alt?: string; folderId?: string },
  ): Promise<MediaMeta>;
  /**
   * Delete a media file.
   *
   * @param id - Media file ID
   */
  delete(id: string): Promise<{ message: string }>;
  /**
   * Download the raw file contents. Returns a `Response` object.
   *
   * @param id - Media file ID
   * @returns Fetch Response with file contents
   */
  getFile(id: string): Promise<Response>;
  /** Client for managing media folders. */
  folders: MediaFoldersClient;
}

/** Client for managing media library folders. */
export interface MediaFoldersClient {
  /**
   * List folders with optional pagination and parent filtering.
   */
  list(params?: {
    limit?: number;
    offset?: number;
    /** Filter by parent folder ID. */
    parentId?: string;
  }): Promise<PaginatedResponse<MediaFolder>>;
  /**
   * Get a single folder by ID.
   *
   * @param id - Folder ID
   */
  get(id: string): Promise<MediaFolder>;
  /**
   * Create a new folder.
   *
   * @param data - Folder name and optional parent ID
   */
  create(data: { name: string; parentId?: string }): Promise<MediaFolder>;
  /**
   * Update a folder's name or parent.
   *
   * @param id - Folder ID
   * @param data - Fields to update
   */
  update(id: string, data: { name?: string; parentId?: string }): Promise<MediaFolder>;
  /**
   * Delete a folder.
   *
   * @param id - Folder ID
   */
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

/**
 * Create a media client.
 *
 * @internal Use `client.media` instead of calling this directly.
 */
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
