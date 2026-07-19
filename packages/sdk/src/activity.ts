import type { HttpClient } from "./client.js";
import type { ActivityEntry, PaginatedResponse } from "./types.js";

export interface ActivityClient {
  list(params?: {
    limit?: number;
    offset?: number;
    action?: string;
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

export function createActivityClient(http: HttpClient): ActivityClient {
  return {
    list(params) {
      const query = params ? toQuery(params) : undefined;
      return http.request("GET", "/api/activity", undefined, { params: query });
    },
  };
}
