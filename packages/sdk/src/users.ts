import type { HttpClient } from "./client.js";
import type { User, PaginatedResponse } from "./types.js";

export interface UsersClient {
  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<User>>;
  get(id: string): Promise<User>;
  create(data: { email: string; password: string; role?: string }): Promise<User>;
  update(id: string, data: { email?: string; role?: string; password?: string }): Promise<User>;
  delete(id: string): Promise<{ message: string }>;
}

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
