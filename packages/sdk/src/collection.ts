import type { HttpClient } from "./client.js";
import type { ListParams, PaginatedResponse } from "./types.js";

export interface CollectionClient<T extends Record<string, unknown>> {
  list(params?: ListParams): Promise<PaginatedResponse<T>>;
  get(id: string): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<{ message: string }>;
  bulkDelete(ids: string[]): Promise<{ deleted: number }>;
  publish(id: string): Promise<T>;
  unpublish(id: string): Promise<T>;
  restore(id: string): Promise<T>;
  versions(id: string): Promise<
    PaginatedResponse<{
      id: string;
      version: number;
      data: Record<string, unknown>;
      createdAt: string;
    }>
  >;
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
