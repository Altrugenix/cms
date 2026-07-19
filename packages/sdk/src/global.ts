import type { HttpClient } from "./client.js";

export interface GlobalClient<T extends Record<string, unknown>> {
  get(): Promise<T>;
  upsert(data: Partial<T>): Promise<T>;
}

export function createGlobalClient<T extends Record<string, unknown>>(
  http: HttpClient,
  slug: string,
): GlobalClient<T> {
  const base = `/api/globals/${slug}`;

  return {
    get() {
      return http.request("GET", base);
    },
    upsert(data) {
      return http.request("PUT", base, data);
    },
  };
}
