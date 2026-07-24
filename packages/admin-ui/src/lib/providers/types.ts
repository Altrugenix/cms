export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string | undefined;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  locale?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
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
    listEntries<T>(slug: string, params?: ListParams): Promise<PaginatedResult<T>>;
    getEntry<T>(slug: string, id: string, locale?: string): Promise<T | null>;
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
    listMedia(params?: ListParams): Promise<PaginatedResult<MediaItem>>;
    getMedia(id: string): Promise<MediaItem | null>;
    uploadMedia(file: File, folderId?: string): Promise<MediaItem>;
    deleteMedia(id: string): Promise<void>;
    getMediaFile(id: string): Promise<string>;
    listFolders(): Promise<MediaFolder[]>;
    createFolder(name: string, parentId?: string): Promise<MediaFolder>;
    renameFolder(id: string, name: string): Promise<void>;
    deleteFolder(id: string): Promise<void>;
  };

  users: {
    listUsers(params?: ListParams): Promise<PaginatedResult<UserItem>>;
    getUser(id: string): Promise<UserItem | null>;
    createUser(data: Omit<UserItem, "id" | "createdAt" | "updatedAt">): Promise<UserItem>;
    updateUser(id: string, data: Partial<UserItem>): Promise<UserItem>;
    deleteUser(id: string): Promise<void>;
  };

  roles: {
    listRoles(params?: ListParams): Promise<PaginatedResult<RoleItem>>;
    getRole(id: string): Promise<RoleItem | null>;
    createRole(data: Omit<RoleItem, "id" | "createdAt" | "updatedAt">): Promise<RoleItem>;
    updateRole(id: string, data: Partial<RoleItem>): Promise<RoleItem>;
    deleteRole(id: string): Promise<void>;
  };

  activity: {
    listActivity(params?: ListParams): Promise<PaginatedResult<ActivityItem>>;
  };

  settings: {
    listApiTokens(params?: ListParams): Promise<PaginatedResult<ApiTokenItem>>;
    createApiToken(data: {
      name: string;
      description?: string;
    }): Promise<{ rawToken: string; token: ApiTokenItem }>;
    deleteApiToken(id: string): Promise<void>;
    listWebhooks(params?: ListParams): Promise<PaginatedResult<WebhookItem>>;
    getWebhook(id: string): Promise<WebhookItem | null>;
    createWebhook(data: {
      name: string;
      url: string;
      events: string[];
      collection?: string;
      secret?: string;
    }): Promise<WebhookItem>;
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
    ): Promise<WebhookItem>;
    deleteWebhook(id: string): Promise<void>;
  };
}

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: string;
  folderId: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface UserItem {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleItem {
  id: string;
  name: string;
  description: string;
  permissions: Array<{ action: string; resource: string; fields?: string[] }>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  action: "create" | "update" | "delete" | "bulkDelete" | "upsert";
  collection: string;
  documentId: string | null;
  label: string;
  createdAt: string;
}

export interface ApiTokenItem {
  id: string;
  name: string;
  lastFour: string;
  description: string;
  role: string;
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
}

export interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  collection: string;
  enabled: boolean;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
  lastStatus: number | null;
  lastSuccess: boolean;
  lastError: string;
  lastDeliveredAt: string | null;
}
