import type { HttpClient } from "./client.js";

/**
 * Typed client for a global content type. Globals are singleton documents
 * (e.g. site settings, navigation) that don't support list or delete operations.
 *
 * @typeParam T - The shape of the global document
 *
 * @example
 * ```ts
 * const settings = client.global<{ siteName: string; logo: string }>("site-settings");
 * const { siteName } = await settings.get();
 * await settings.upsert({ siteName: "My Site" });
 * ```
 */
export interface GlobalClient<T extends Record<string, unknown>> {
  /**
   * Get the global document.
   *
   * @returns The global document
   */
  get(): Promise<T>;
  /**
   * Create or update the global document.
   *
   * @param data - Fields to set
   * @returns The updated global document
   */
  upsert(data: Partial<T>): Promise<T>;
}

/**
 * Create a global client.
 *
 * @internal Use `client.global(slug)` instead of calling this directly.
 */
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
