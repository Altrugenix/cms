import { describe, it, expect } from "vitest";

import {
  createFirebaseProvider,
  initializeFirebase,
  getFirebaseConfig,
  createFirebaseAuthProvider,
  createFirestoreContentProvider,
  createFirestoreGlobalsProvider,
  createFirebaseStorageProvider,
  createFirestoreUsersProvider,
  createFirestoreRolesProvider,
  createFirestoreActivityProvider,
  type FirebaseAuthProvider,
  type FirestoreContentProvider,
  type FirestoreGlobalsProvider,
  type FirebaseStorageProvider,
  type FirestoreUsersProvider,
  type FirestoreRolesProvider,
  type FirestoreActivityProvider,
} from "../src/index";

describe("@arche-cms/cms-firebase", () => {
  it("exports all provider factory functions", () => {
    expect(typeof createFirebaseProvider).toBe("function");
    expect(typeof initializeFirebase).toBe("function");
    expect(typeof getFirebaseConfig).toBe("function");
    expect(typeof createFirebaseAuthProvider).toBe("function");
    expect(typeof createFirestoreContentProvider).toBe("function");
    expect(typeof createFirestoreGlobalsProvider).toBe("function");
    expect(typeof createFirebaseStorageProvider).toBe("function");
    expect(typeof createFirestoreUsersProvider).toBe("function");
    expect(typeof createFirestoreRolesProvider).toBe("function");
    expect(typeof createFirestoreActivityProvider).toBe("function");
  });

  it("getFirebaseConfig returns null when env vars are missing", () => {
    const config = getFirebaseConfig();
    expect(config).toBeNull();
  });

  it("createFirebaseProvider returns provider object", () => {
    const mockAuth = {} as FirebaseAuthProvider;
    const mockContent = {} as FirestoreContentProvider;
    const mockGlobals = {} as FirestoreGlobalsProvider;
    const mockStorage = {} as FirebaseStorageProvider;
    const mockUsers = {} as FirestoreUsersProvider;
    const mockRoles = {} as FirestoreRolesProvider;
    const mockActivity = {} as FirestoreActivityProvider;

    const provider = createFirebaseProvider({
      activity: mockActivity,
      auth: mockAuth,
      content: mockContent,
      globals: mockGlobals,
      roles: mockRoles,
      storage: mockStorage,
      users: mockUsers,
    });

    expect(provider).toBeDefined();
    expect(provider.auth).toBe(mockAuth);
    expect(provider.collections).toBe(mockContent);
    expect(provider.globals).toBe(mockGlobals);
    expect(provider.media).toBe(mockStorage);
    expect(provider.users).toBe(mockUsers);
    expect(provider.roles).toBe(mockRoles);
    expect(provider.activity).toBe(mockActivity);
  });
});
