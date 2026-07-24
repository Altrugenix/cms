import type { ArcheConfig } from "./types.js";

import { createActivityClient, type ActivityClient } from "./activity.js";
import { createAuthClient, type AuthClient } from "./auth.js";
import { createHttpClient } from "./client.js";
import { createCollectionClient, type CollectionClient } from "./collection.js";
import { createGlobalClient, type GlobalClient } from "./global.js";
import { createMediaClient, type MediaClient } from "./media.js";
import { createRolesClient, type RolesClient } from "./roles.js";
import { createSettingsClient, type SettingsClient } from "./settings.js";
import { createUsersClient, type UsersClient } from "./users.js";

/**
 * Top-level client returned by {@link createClient}. Provides access to all
 * Arche API resources through typed sub-clients.
 *
 * @example
 * ```ts
 * const client = createClient({ baseUrl: "http://localhost:3000" });
 *
 * // List posts
 * const { data: posts } = await client.collection("posts").list();
 *
 * // Get a single post
 * const post = await client.collection("posts").get("abc123");
 *
 * // Auth
 * const { accessToken } = await client.auth.login("admin@example.com", "password");
 * client.setToken(accessToken);
 * ```
 */
export interface ArcheClient {
  /**
   * Get a typed client for a collection.
   *
   * @param slug - Collection slug (must match a schema definition)
   * @returns Collection client with CRUD, publish, and versioning operations
   */
  collection<T extends Record<string, unknown> = Record<string, unknown>>(
    slug: string,
  ): CollectionClient<T>;
  /**
   * Get a typed client for a global.
   *
   * @param slug - Global slug (must match a schema definition)
   * @returns Global client with get and upsert operations
   */
  global<T extends Record<string, unknown> = Record<string, unknown>>(
    slug: string,
  ): GlobalClient<T>;
  /** Authentication operations (login, refresh, password reset). */
  auth: AuthClient;
  /** Media file operations (upload, list, delete). */
  media: MediaClient;
  /** User management operations. */
  users: UsersClient;
  /** Role management operations. */
  roles: RolesClient;
  /** Activity/audit log operations. */
  activity: ActivityClient;
  /** Settings operations (API tokens, webhooks). */
  settings: SettingsClient;
  /**
   * Update the JWT access token used for authenticated requests.
   *
   * @param token - New access token
   */
  setToken(token: string): void;
}

/**
 * Create a new Arche SDK client.
 *
 * This is the primary entry point for interacting with the Arche CMS API.
 *
 * @param config - Client configuration (base URL, optional token, optional fetch)
 * @returns A fully configured client with typed sub-clients for all resources
 */
export function createClient(config: ArcheConfig): ArcheClient {
  const http = createHttpClient(config);
  const collectionClients = new Map<string, CollectionClient<Record<string, unknown>>>();
  const globalClients = new Map<string, GlobalClient<Record<string, unknown>>>();

  return {
    activity: createActivityClient(http),
    auth: createAuthClient(http),
    collection<T extends Record<string, unknown> = Record<string, unknown>>(
      slug: string,
    ): CollectionClient<T> {
      let client = collectionClients.get(slug) as CollectionClient<T> | undefined;
      if (!client) {
        client = createCollectionClient<T>(http, slug);
        collectionClients.set(slug, client as CollectionClient<Record<string, unknown>>);
      }
      return client;
    },
    global<T extends Record<string, unknown> = Record<string, unknown>>(
      slug: string,
    ): GlobalClient<T> {
      let client = globalClients.get(slug) as GlobalClient<T> | undefined;
      if (!client) {
        client = createGlobalClient<T>(http, slug);
        globalClients.set(slug, client as GlobalClient<Record<string, unknown>>);
      }
      return client;
    },
    media: createMediaClient(http),
    roles: createRolesClient(http),
    settings: createSettingsClient(http),
    setToken(token: string) {
      http.setToken(token);
    },
    users: createUsersClient(http),
  };
}
