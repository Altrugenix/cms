import type { HttpClient } from "./client.js";
import type { User, PaginatedResponse } from "./types.js";

/** Client for user management operations. Requires admin privileges. */
export interface UsersClient {
  /**
   * List users with optional pagination.
   *
   * @param params - Pagination parameters
   */
  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<User>>;
  /**
   * Get a single user by ID.
   *
   * @param id - User ID
   */
  get(id: string): Promise<User>;
  /**
   * Create a new user account.
   *
   * @param data - User data (email, password, optional role)
   */
  create(data: { email: string; password: string; role?: string }): Promise<User>;
  /**
   * Update a user's email, role, or password.
   *
   * @param id - User ID
   * @param data - Fields to update
   */
  update(id: string, data: { email?: string; role?: string; password?: string }): Promise<User>;
  /**
   * Delete a user account.
   *
   * @param id - User ID
   */
  delete(id: string): Promise<{ message: string }>;
}

/**
 * Create a users client.
 *
 * @internal Use `client.users` instead of calling this directly.
 */
export function createUsersClient(http: HttpClient): UsersClient {
  const base = "/api/users";

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
