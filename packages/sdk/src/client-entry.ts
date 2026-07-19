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

export interface ArcheClient {
  collection<T extends Record<string, unknown> = Record<string, unknown>>(
    slug: string,
  ): CollectionClient<T>;
  global<T extends Record<string, unknown> = Record<string, unknown>>(
    slug: string,
  ): GlobalClient<T>;
  auth: AuthClient;
  media: MediaClient;
  users: UsersClient;
  roles: RolesClient;
  activity: ActivityClient;
  settings: SettingsClient;
  setToken(token: string): void;
}

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
