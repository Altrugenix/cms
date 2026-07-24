import { describe, it, expect } from "vitest";

import type { FirebaseAuthProvider } from "../src/auth";

import { createFirestoreActivityProvider } from "../src/activity";
import { createFirestoreContentProvider } from "../src/content";
import { createFirestoreGlobalsProvider } from "../src/globals";
import { createFirebaseStorageProvider } from "../src/media";
import { createFirebaseProvider } from "../src/provider";
import { createFirestoreRolesProvider } from "../src/roles";
import { createFirestoreUsersProvider } from "../src/users";

describe("Firebase Provider Contract Conformance", () => {
  const mockAuth = {
    forgotPassword: async () => {},
    getCurrentUser: async () => null,
    login: async () => ({ displayName: null, email: "test@test.com", photoURL: null, uid: "1" }),
    logout: async () => {},
    register: async () => ({ displayName: null, email: "test@test.com", photoURL: null, uid: "1" }),
    resetPassword: async () => {},
  } as FirebaseAuthProvider;
  const mockContent = createFirestoreContentProvider();
  const mockGlobals = createFirestoreGlobalsProvider();
  const mockStorage = createFirebaseStorageProvider();
  const mockUsers = createFirestoreUsersProvider();
  const mockRoles = createFirestoreRolesProvider();
  const mockActivity = createFirestoreActivityProvider();

  const provider = createFirebaseProvider({
    activity: mockActivity,
    auth: mockAuth,
    content: mockContent,
    globals: mockGlobals,
    roles: mockRoles,
    storage: mockStorage,
    users: mockUsers,
  });

  it("implements auth namespace with all required methods", () => {
    expect(typeof provider.auth.login).toBe("function");
    expect(typeof provider.auth.register).toBe("function");
    expect(typeof provider.auth.logout).toBe("function");
    expect(typeof provider.auth.getCurrentUser).toBe("function");
    expect(typeof provider.auth.forgotPassword).toBe("function");
    expect(typeof provider.auth.resetPassword).toBe("function");
  });

  it("implements collections namespace with all required methods", () => {
    expect(typeof provider.collections.listEntries).toBe("function");
    expect(typeof provider.collections.getEntry).toBe("function");
    expect(typeof provider.collections.createEntry).toBe("function");
    expect(typeof provider.collections.updateEntry).toBe("function");
    expect(typeof provider.collections.deleteEntry).toBe("function");
    expect(typeof provider.collections.bulkDelete).toBe("function");
    expect(typeof provider.collections.publishEntry).toBe("function");
    expect(typeof provider.collections.unpublishEntry).toBe("function");
    expect(typeof provider.collections.restoreEntry).toBe("function");
  });

  it("implements globals namespace with all required methods", () => {
    expect(typeof provider.globals.getGlobal).toBe("function");
    expect(typeof provider.globals.upsertGlobal).toBe("function");
  });

  it("implements media namespace with all required methods", () => {
    expect(typeof provider.media.listMedia).toBe("function");
    expect(typeof provider.media.getMedia).toBe("function");
    expect(typeof provider.media.uploadMedia).toBe("function");
    expect(typeof provider.media.deleteMedia).toBe("function");
    expect(typeof provider.media.getMediaFile).toBe("function");
    expect(typeof provider.media.listFolders).toBe("function");
    expect(typeof provider.media.createFolder).toBe("function");
    expect(typeof provider.media.renameFolder).toBe("function");
    expect(typeof provider.media.deleteFolder).toBe("function");
  });

  it("implements users namespace with all required methods", () => {
    expect(typeof provider.users.listUsers).toBe("function");
    expect(typeof provider.users.getUser).toBe("function");
    expect(typeof provider.users.createUser).toBe("function");
    expect(typeof provider.users.updateUser).toBe("function");
    expect(typeof provider.users.deleteUser).toBe("function");
  });

  it("implements roles namespace with all required methods", () => {
    expect(typeof provider.roles.listRoles).toBe("function");
    expect(typeof provider.roles.getRole).toBe("function");
    expect(typeof provider.roles.createRole).toBe("function");
    expect(typeof provider.roles.updateRole).toBe("function");
    expect(typeof provider.roles.deleteRole).toBe("function");
  });

  it("implements activity namespace with all required methods", () => {
    expect(typeof provider.activity.listActivity).toBe("function");
    expect(typeof provider.activity.recordActivity).toBe("function");
  });

  it("wraps content with activity logging when userId is provided", () => {
    const providerWithActivity = createFirebaseProvider({
      activity: mockActivity,
      auth: mockAuth,
      content: mockContent,
      globals: mockGlobals,
      roles: mockRoles,
      storage: mockStorage,
      userId: "test-user",
      users: mockUsers,
    });
    expect(providerWithActivity.collections).toBeDefined();
    expect(typeof providerWithActivity.collections.createEntry).toBe("function");
  });

  it("returns raw content when no userId is provided", () => {
    expect(provider.collections).toBe(mockContent);
  });
});
