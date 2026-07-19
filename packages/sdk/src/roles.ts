import type { HttpClient } from "./client.js";
import type { Role, PaginatedResponse } from "./types.js";

export interface RolesClient {
  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Role>>;
  get(id: string): Promise<Role>;
  create(data: {
    name: string;
    description?: string;
    permissions?: Array<{ action: string; resource: string }>;
  }): Promise<Role>;
  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: Array<{ action: string; resource: string }>;
    },
  ): Promise<Role>;
  delete(id: string): Promise<{ message: string }>;
}

export function createRolesClient(http: HttpClient): RolesClient {
  const base = "/api/roles";

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
      const query: Record<string, string | number> = {};
      if (params?.limit !== undefined) query.limit = params.limit;
      if (params?.offset !== undefined) query.offset = params.offset;
      return http.request("GET", base, undefined, {
        params: Object.keys(query).length ? query : undefined,
      });
    },
    update(id, data) {
      return http.request("PATCH", `${base}/${id}`, data);
    },
  };
}
