import type { HttpClient } from "./client.js";
import type { Role, PaginatedResponse } from "./types.js";

/** Client for role management operations. Requires admin privileges. */
export interface RolesClient {
  /**
   * List roles with optional pagination.
   *
   * @param params - Pagination parameters
   */
  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Role>>;
  /**
   * Get a single role by ID.
   *
   * @param id - Role ID
   */
  get(id: string): Promise<Role>;
  /**
   * Create a new role.
   *
   * @param data - Role data (name, optional description, optional permissions)
   */
  create(data: {
    name: string;
    description?: string;
    permissions?: Array<{ action: string; resource: string }>;
  }): Promise<Role>;
  /**
   * Update a role's name, description, or permissions.
   *
   * @param id - Role ID
   * @param data - Fields to update
   */
  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: Array<{ action: string; resource: string }>;
    },
  ): Promise<Role>;
  /**
   * Delete a role.
   *
   * @param id - Role ID
   */
  delete(id: string): Promise<{ message: string }>;
}

/**
 * Create a roles client.
 *
 * @internal Use `client.roles` instead of calling this directly.
 */
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
