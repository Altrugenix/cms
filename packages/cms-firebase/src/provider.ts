import type { FirestoreActivityProvider, ActivityEvent, ListActivityParams } from "./activity";
import type { FirebaseAuthProvider } from "./auth";
import type { FirestoreContentProvider, ListParams, PaginatedResult } from "./content";
import type { FirestoreGlobalsProvider } from "./globals";
import type { FirebaseStorageProvider, MediaFile, MediaFolder, ListMediaParams } from "./media";
import type { FirestoreRolesProvider, Role, ListRolesParams } from "./roles";
import type { FirestoreUsersProvider, User, ListUsersParams } from "./users";

export interface FirebaseProviderOptions {
  auth: FirebaseAuthProvider;
  content: FirestoreContentProvider;
  globals: FirestoreGlobalsProvider;
  storage: FirebaseStorageProvider;
  users: FirestoreUsersProvider;
  roles: FirestoreRolesProvider;
  activity: FirestoreActivityProvider;
}

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
    onAuthStateChanged(callback: (user: AdminUser | null) => void): () => void;
  };

  collections: {
    listEntries<T>(slug: string, params?: ListParams): Promise<PaginatedResult<T>>;
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
    uploadMedia(file: File, folderId?: string): Promise<MediaFile>;
    listMedia(params?: ListMediaParams): Promise<MediaFile[]>;
    getMedia(id: string): Promise<MediaFile | null>;
    deleteMedia(id: string): Promise<void>;
    getMediaFile(id: string): Promise<string>;
    listFolders(): Promise<MediaFolder[]>;
    createFolder(name: string): Promise<MediaFolder>;
    renameFolder(id: string, name: string): Promise<void>;
    deleteFolder(id: string): Promise<void>;
  };

  users: {
    listUsers(params?: ListUsersParams): Promise<User[]>;
    getUser(id: string): Promise<User | null>;
    createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
    updateUser(id: string, data: Partial<User>): Promise<User>;
    deleteUser(id: string): Promise<void>;
  };

  roles: {
    listRoles(params?: ListRolesParams): Promise<Role[]>;
    getRole(id: string): Promise<Role | null>;
    createRole(data: Omit<Role, "id" | "createdAt" | "updatedAt">): Promise<Role>;
    updateRole(id: string, data: Partial<Role>): Promise<Role>;
    deleteRole(id: string): Promise<void>;
  };

  activity: {
    recordActivity(event: Omit<ActivityEvent, "id" | "timestamp">): Promise<void>;
    listActivity(params?: ListActivityParams): Promise<ActivityEvent[]>;
  };
}

export function createFirebaseProvider(options: FirebaseProviderOptions): AdminProvider {
  return {
    activity: options.activity,
    auth: options.auth,
    collections: options.content,
    globals: options.globals,
    media: options.storage,
    roles: options.roles,
    users: options.users,
  };
}
