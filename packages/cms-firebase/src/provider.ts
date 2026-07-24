import type { FirestoreActivityProvider } from "./activity";
import type { FirestoreApiTokensProvider, ApiToken } from "./api-tokens";
import type { FirebaseAuthProvider } from "./auth";
import type { FirestoreContentProvider } from "./content";
import type { FirestoreGlobalsProvider } from "./globals";
import type { FirebaseStorageProvider } from "./media";
import type { FirestoreRolesProvider } from "./roles";
import type { FirestoreUsersProvider } from "./users";
import type { FirestoreWebhooksProvider, Webhook } from "./webhooks";

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string | undefined;
}

export interface AdminProvider {
  auth: {
    login(email: string, password: string): Promise<AdminUser>;
    register(email: string, password: string, name: string): Promise<AdminUser>;
    logout(): Promise<void>;
    getCurrentUser(): Promise<AdminUser | null>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, password: string): Promise<void>;
  };

  collections: {
    listEntries<T>(
      slug: string,
      params?: { limit?: number; offset?: number },
    ): Promise<{ data: T[]; total: number }>;
    getEntry<T>(slug: string, id: string): Promise<T | null>;
    createEntry<T>(slug: string, data: Partial<T>): Promise<T>;
    updateEntry<T>(slug: string, id: string, data: Partial<T>): Promise<T>;
    deleteEntry(slug: string, id: string): Promise<void>;
    bulkDelete(slug: string, ids: string[]): Promise<void>;
    publishEntry(slug: string, id: string): Promise<void>;
    unpublishEntry(slug: string, id: string): Promise<void>;
    restoreEntry(slug: string, id: string): Promise<void>;
  };

  globals: {
    getGlobal<T>(slug: string): Promise<T | null>;
    upsertGlobal<T>(slug: string, data: Partial<T>): Promise<T>;
  };

  media: {
    uploadMedia(file: File, folderId?: string): Promise<import("./media").MediaFile>;
    listMedia(params?: {
      limit?: number;
      offset?: number;
    }): Promise<{ data: import("./media").MediaFile[]; total: number }>;
    getMedia(id: string): Promise<import("./media").MediaFile | null>;
    deleteMedia(id: string): Promise<void>;
    getMediaFile(id: string): Promise<string>;
    listFolders(): Promise<import("./media").MediaFolder[]>;
    createFolder(name: string): Promise<import("./media").MediaFolder>;
    renameFolder(id: string, name: string): Promise<void>;
    deleteFolder(id: string): Promise<void>;
  };

  users: {
    listUsers(params?: {
      limit?: number;
      offset?: number;
    }): Promise<{ data: import("./users").User[]; total: number }>;
    getUser(id: string): Promise<import("./users").User | null>;
    createUser(
      data: Omit<import("./users").User, "id" | "createdAt" | "updatedAt">,
    ): Promise<import("./users").User>;
    updateUser(id: string, data: Partial<import("./users").User>): Promise<import("./users").User>;
    deleteUser(id: string): Promise<void>;
  };

  roles: {
    listRoles(params?: {
      limit?: number;
      offset?: number;
    }): Promise<{ data: import("./roles").Role[]; total: number }>;
    getRole(id: string): Promise<import("./roles").Role | null>;
    createRole(
      data: Omit<import("./roles").Role, "id" | "createdAt" | "updatedAt">,
    ): Promise<import("./roles").Role>;
    updateRole(id: string, data: Partial<import("./roles").Role>): Promise<import("./roles").Role>;
    deleteRole(id: string): Promise<void>;
  };

  activity: {
    recordActivity(
      event: Omit<import("./activity").ActivityEvent, "id" | "timestamp">,
    ): Promise<void>;
    listActivity(params?: {
      limit?: number;
    }): Promise<{ data: import("./activity").ActivityEvent[]; total: number }>;
  };

  settings: {
    listApiTokens(params?: {
      limit?: number;
      offset?: number;
    }): Promise<{ data: ApiToken[]; total: number }>;
    createApiToken(data: {
      name: string;
      description?: string;
    }): Promise<{ rawToken: string; token: ApiToken }>;
    deleteApiToken(id: string): Promise<void>;
    listWebhooks(params?: {
      limit?: number;
      offset?: number;
    }): Promise<{ data: Webhook[]; total: number }>;
    getWebhook(id: string): Promise<Webhook | null>;
    createWebhook(data: {
      name: string;
      url: string;
      events: string[];
      collection?: string;
      secret?: string;
    }): Promise<Webhook>;
    updateWebhook(
      id: string,
      data: Partial<{
        name: string;
        url: string;
        events: string[];
        collection: string;
        enabled: boolean;
        secret: string;
      }>,
    ): Promise<Webhook>;
    deleteWebhook(id: string): Promise<void>;
  };
}

export interface FirebaseProviderOptions {
  auth: FirebaseAuthProvider;
  content: FirestoreContentProvider;
  globals: FirestoreGlobalsProvider;
  storage: FirebaseStorageProvider;
  users: FirestoreUsersProvider;
  roles: FirestoreRolesProvider;
  activity: FirestoreActivityProvider;
  apiTokens: FirestoreApiTokensProvider;
  webhooks: FirestoreWebhooksProvider;
  userId?: string;
}

function wrapContentWithActivity(
  content: FirestoreContentProvider,
  activity: FirestoreActivityProvider,
  userId: string,
): FirestoreContentProvider {
  return {
    ...content,

    async bulkDelete(slug: string, ids: string[]): Promise<void> {
      await content.bulkDelete(slug, ids);
      await activity.recordActivity({
        action: "delete",
        collection: slug,
        data: { ids },
        userId,
      });
    },

    async createEntry<T>(slug: string, data: Partial<T>): Promise<T> {
      const result = await content.createEntry<T>(slug, data);
      const entryId = (result as { id?: string }).id;
      await activity.recordActivity({
        action: "create",
        collection: slug,
        ...(entryId !== undefined ? { entryId } : {}),
        userId,
      });
      return result;
    },

    async deleteEntry(slug: string, id: string): Promise<void> {
      await content.deleteEntry(slug, id);
      await activity.recordActivity({
        action: "delete",
        collection: slug,
        entryId: id,
        userId,
      });
    },

    async publishEntry(slug: string, id: string): Promise<void> {
      await content.publishEntry(slug, id);
      await activity.recordActivity({
        action: "publish",
        collection: slug,
        entryId: id,
        userId,
      });
    },

    async unpublishEntry(slug: string, id: string): Promise<void> {
      await content.unpublishEntry(slug, id);
      await activity.recordActivity({
        action: "unpublish",
        collection: slug,
        entryId: id,
        userId,
      });
    },

    async updateEntry<T>(slug: string, id: string, data: Partial<T>): Promise<T> {
      const result = await content.updateEntry<T>(slug, id, data);
      await activity.recordActivity({
        action: "update",
        collection: slug,
        entryId: id,
        userId,
      });
      return result;
    },
  };
}

export function createFirebaseProvider(options: FirebaseProviderOptions): AdminProvider {
  const content = options.userId
    ? wrapContentWithActivity(options.content, options.activity, options.userId)
    : options.content;

  return {
    activity: options.activity,
    auth: options.auth,
    collections: content,
    globals: options.globals,
    media: options.storage,
    roles: options.roles,
    settings: {
      async createApiToken(data) {
        return options.apiTokens.createApiToken(data, options.userId ?? "anonymous");
      },
      async createWebhook(data) {
        return options.webhooks.createWebhook(data);
      },
      async deleteApiToken(id) {
        await options.apiTokens.deleteApiToken(id);
      },
      async deleteWebhook(id) {
        await options.webhooks.deleteWebhook(id);
      },
      async getWebhook(id) {
        return options.webhooks.getWebhook(id);
      },
      async listApiTokens(params) {
        return options.apiTokens.listApiTokens(params);
      },
      async listWebhooks(params) {
        return options.webhooks.listWebhooks(params);
      },
      async updateWebhook(id, data) {
        return options.webhooks.updateWebhook(id, data);
      },
    },
    users: options.users,
  };
}
