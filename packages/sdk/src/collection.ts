import type { HttpClient } from "./client.js";
import type { ListParams, PaginatedResponse } from "./types.js";

/**
 * Typed client for a single collection. Provides CRUD, publish/unpublish,
 * versioning, and bulk operations.
 *
 * @typeParam T - The shape of documents in this collection
 *
 * @example
 * ```ts
 * const posts = client.collection<{ title: string; slug: string }>("posts");
 *
 * // List
 * const { data, total } = await posts.list({ limit: 10, sort: "-createdAt" });
 *
 * // Create
 * const post = await posts.create({ title: "Hello", slug: "hello" });
 *
 * // Publish
 * await posts.publish(post.id);
 * ```
 */
export interface CollectionClient<T extends Record<string, unknown>> {
  /**
   * List documents with optional filtering, pagination, and sorting.
   *
   * @param params - Query parameters
   * @returns Paginated response with data array and total count
   */
  list(params?: ListParams): Promise<PaginatedResponse<T>>;
  /**
   * Get a single document by ID.
   *
   * @param id - Document ID
   * @returns The document
   */
  get(id: string): Promise<T>;
  /**
   * Create a new document.
   *
   * @param data - Document fields
   * @returns The created document
   */
  create(data: Partial<T>): Promise<T>;
  /**
   * Update an existing document.
   *
   * @param id - Document ID
   * @param data - Fields to update
   * @returns The updated document
   */
  update(id: string, data: Partial<T>): Promise<T>;
  /**
   * Soft-delete a document.
   *
   * @param id - Document ID
   */
  delete(id: string): Promise<{ message: string }>;
  /**
   * Soft-delete multiple documents at once.
   *
   * @param ids - Array of document IDs to delete
   * @returns Number of deleted documents
   */
  bulkDelete(ids: string[]): Promise<{ deleted: number }>;
  /**
   * Publish a draft document (make it publicly visible).
   *
   * @param id - Document ID
   * @returns The published document
   */
  publish(id: string): Promise<T>;
  /**
   * Unpublish a document (revert to draft).
   *
   * @param id - Document ID
   * @returns The unpublished document
   */
  unpublish(id: string): Promise<T>;
  /**
   * Restore a soft-deleted document.
   *
   * @param id - Document ID
   * @returns The restored document
   */
  restore(id: string): Promise<T>;
  /**
   * List all versions of a document.
   *
   * @param id - Document ID
   * @returns Paginated version history
   */
  versions(id: string): Promise<
    PaginatedResponse<{
      id: string;
      version: number;
      data: Record<string, unknown>;
      createdAt: string;
    }>
  >;
  /**
   * Restore a specific version of a document.
   *
   * @param id - Document ID
   * @param versionId - Version ID to restore
   * @returns The restored document
   */
  restoreVersion(id: string, versionId: string): Promise<T>;
}

function addParam(
  result: Record<string, string | number | boolean | undefined>,
  key: string,
  value: string | number | boolean | undefined,
): void {
  if (value !== undefined) {
    result[key] = value;
  }
}

function buildListParams(
  params?: ListParams,
): Record<string, string | number | boolean | undefined> | undefined {
  if (!params) return undefined;
  const result: Record<string, string | number | boolean | undefined> = {};
  addParam(result, "limit", params.limit);
  addParam(result, "offset", params.offset);
  addParam(result, "sort", params.sort);
  addParam(result, "locale", params.locale);
  addParam(result, "deleted", params.deleted);
  if (params.select) addParam(result, "select", params.select.join(","));
  if (params.populate) addParam(result, "populate", params.populate.join(","));
  if (params.where) {
    for (const [key, value] of Object.entries(params.where)) {
      addParam(result, `where[${key}]`, value);
    }
  }
  return result;
}

/**
 * Create a collection client.
 *
 * @internal Use `client.collection(slug)` instead of calling this directly.
 */
export function createCollectionClient<T extends Record<string, unknown>>(
  http: HttpClient,
  slug: string,
): CollectionClient<T> {
  const base = `/api/${slug}`;

  return {
    bulkDelete(ids) {
      return http.request("POST", `${base}/bulk-delete`, { ids });
    },
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
      return http.request("GET", base, undefined, { params: buildListParams(params) });
    },
    publish(id) {
      return http.request("POST", `${base}/${id}/publish`);
    },
    restore(id) {
      return http.request("POST", `${base}/${id}/restore`);
    },
    restoreVersion(id, versionId) {
      return http.request("POST", `${base}/${id}/versions/${versionId}/restore`);
    },
    unpublish(id) {
      return http.request("POST", `${base}/${id}/unpublish`);
    },
    update(id, data) {
      return http.request("PATCH", `${base}/${id}`, data);
    },
    versions(id) {
      return http.request("GET", `${base}/${id}/versions`);
    },
  };
}
