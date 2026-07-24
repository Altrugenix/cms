import type { HttpClient } from "./client.js";
import type { ActivityEntry, PaginatedResponse } from "./types.js";

/** Client for querying the activity/audit log. */
export interface ActivityClient {
  /**
   * List activity entries with optional filtering and pagination.
   *
   * @param params - Query parameters (limit, offset, action, collection)
   */
  list(params?: {
    limit?: number;
    offset?: number;
    /** Filter by action type (e.g. `"create"`, `"update"`, `"delete"`). */
    action?: string;
    /** Filter by collection slug. */
    collection?: string;
  }): Promise<PaginatedResponse<ActivityEntry>>;
}

function toQuery(params: Record<string, unknown>): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) result[key] = value as string | number;
  }
  return result;
}

/**
 * Create an activity client.
 *
 * @internal Use `client.activity` instead of calling this directly.
 */
export function createActivityClient(http: HttpClient): ActivityClient {
  return {
    list(params) {
      const query = params ? toQuery(params) : undefined;
      return http.request("GET", "/api/activity", undefined, { params: query });
    },
  };
}
