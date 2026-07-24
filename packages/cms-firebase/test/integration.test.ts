import { describe, it, expect, beforeAll, beforeEach } from "vitest";

import { createFirestoreActivityProvider, type FirestoreActivityProvider } from "../src/activity";
import { createFirestoreContentProvider, type FirestoreContentProvider } from "../src/content";
import { createFirestoreGlobalsProvider, type FirestoreGlobalsProvider } from "../src/globals";
import { createFirestoreRolesProvider, type FirestoreRolesProvider } from "../src/roles";
import { createFirestoreUsersProvider, type FirestoreUsersProvider } from "../src/users";

const isEmulatorAvailable = !!process.env.FIREBASE_EMULATOR;

describe.skipIf(!isEmulatorAvailable)("Firebase Emulator Integration", () => {
  let contentProvider: FirestoreContentProvider;
  let globalsProvider: FirestoreGlobalsProvider;
  let usersProvider: FirestoreUsersProvider;
  let rolesProvider: FirestoreRolesProvider;
  let activityProvider: FirestoreActivityProvider;

  beforeAll(() => {
    contentProvider = createFirestoreContentProvider();
    globalsProvider = createFirestoreGlobalsProvider();
    usersProvider = createFirestoreUsersProvider();
    rolesProvider = createFirestoreRolesProvider();
    activityProvider = createFirestoreActivityProvider();
  });

  describe("Firestore Content Provider", () => {
    const testSlug = "test-posts";
    let createdId: string;

    beforeEach(async () => {
      const entry = await contentProvider.createEntry(testSlug, {
        body: "Test body",
        status: "draft",
        title: "Test Post",
      });
      createdId = (entry as { id: string }).id;
    });

    it("creates an entry and returns it with id", async () => {
      const entry = await contentProvider.createEntry(testSlug, {
        body: "Another body",
        title: "Another Post",
      });
      expect(entry).toBeDefined();
      expect((entry as { id: string }).id).toBeTruthy();
      expect((entry as { title: string }).title).toBe("Another Post");
    });

    it("gets an entry by id", async () => {
      const entry = await contentProvider.getEntry(testSlug, createdId);
      expect(entry).not.toBeNull();
      expect((entry as { id: string }).id).toBe(createdId);
      expect((entry as { title: string }).title).toBe("Test Post");
    });

    it("returns null for non-existent entry", async () => {
      const entry = await contentProvider.getEntry(testSlug, "non-existent-id");
      expect(entry).toBeNull();
    });

    it("updates an entry", async () => {
      const updated = await contentProvider.updateEntry(testSlug, createdId, {
        title: "Updated Post",
      });
      expect((updated as { title: string }).title).toBe("Updated Post");

      const fetched = await contentProvider.getEntry(testSlug, createdId);
      expect((fetched as { title: string }).title).toBe("Updated Post");
    });

    it("publishes an entry", async () => {
      await contentProvider.publishEntry(testSlug, createdId);
      const entry = await contentProvider.getEntry(testSlug, createdId);
      expect((entry as { _status: string })._status).toBe("published");
    });

    it("unpublishes an entry", async () => {
      await contentProvider.publishEntry(testSlug, createdId);
      await contentProvider.unpublishEntry(testSlug, createdId);
      const entry = await contentProvider.getEntry(testSlug, createdId);
      expect((entry as { _status: string })._status).toBe("draft");
    });

    it("soft-deletes an entry", async () => {
      await contentProvider.deleteEntry(testSlug, createdId);
      const entry = await contentProvider.getEntry(testSlug, createdId);
      expect((entry as { _deletedAt: string | null })._deletedAt).toBeTruthy();
    });

    it("restores a soft-deleted entry", async () => {
      await contentProvider.deleteEntry(testSlug, createdId);
      await contentProvider.restoreEntry(testSlug, createdId);
      const entry = await contentProvider.getEntry(testSlug, createdId);
      expect((entry as { _deletedAt: string | null })._deletedAt).toBeNull();
    });

    it("lists entries with pagination", async () => {
      const result = await contentProvider.listEntries(testSlug, {
        limit: 10,
        offset: 0,
      });
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it("bulk-deletes entries", async () => {
      const entry1 = await contentProvider.createEntry(testSlug, {
        title: "Bulk 1",
      });
      const entry2 = await contentProvider.createEntry(testSlug, {
        title: "Bulk 2",
      });
      await contentProvider.bulkDelete(testSlug, [
        (entry1 as { id: string }).id,
        (entry2 as { id: string }).id,
      ]);

      const e1 = await contentProvider.getEntry(testSlug, (entry1 as { id: string }).id);
      const e2 = await contentProvider.getEntry(testSlug, (entry2 as { id: string }).id);
      expect((e1 as { _deletedAt: string | null })._deletedAt).toBeTruthy();
      expect((e2 as { _deletedAt: string | null })._deletedAt).toBeTruthy();
    });
  });

  describe("Firestore Globals Provider", () => {
    it("upserts and gets a global", async () => {
      const slug = "test-site-config";
      const data = { siteName: "Test Site", tagline: "Hello World" };
      await globalsProvider.upsertGlobal(slug, data);
      const result = await globalsProvider.getGlobal(slug);
      expect(result).not.toBeNull();
      expect((result as { siteName: string }).siteName).toBe("Test Site");
    });

    it("returns null for non-existent global", async () => {
      const result = await globalsProvider.getGlobal("non-existent-global");
      expect(result).toBeNull();
    });

    it("merges data on upsert", async () => {
      const slug = "test-merge-global";
      await globalsProvider.upsertGlobal(slug, { a: 1, b: 2 });
      await globalsProvider.upsertGlobal(slug, { b: 3, c: 4 });
      const result = await globalsProvider.getGlobal(slug);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });
  });

  describe("Firestore Users Provider", () => {
    let userId: string;

    it("creates a user", async () => {
      const user = await usersProvider.createUser({
        email: "test@example.com",
        name: "Test User",
        role: "viewer",
      });
      userId = user.id;
      expect(user.email).toBe("test@example.com");
      expect(user.role).toBe("viewer");
    });

    it("gets a user by id", async () => {
      const user = await usersProvider.getUser(userId);
      expect(user).not.toBeNull();
      expect(user?.email).toBe("test@example.com");
    });

    it("lists users", async () => {
      const result = await usersProvider.listUsers();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it("updates a user", async () => {
      const updated = await usersProvider.updateUser(userId, { name: "Updated User" });
      expect(updated.name).toBe("Updated User");
    });

    it("deletes a user", async () => {
      await usersProvider.deleteUser(userId);
      const user = await usersProvider.getUser(userId);
      expect(user).toBeNull();
    });
  });

  describe("Firestore Roles Provider", () => {
    let roleId: string;

    it("creates a role", async () => {
      const role = await rolesProvider.createRole({
        description: "Test editor role",
        name: "test-editor",
        permissions: [{ action: "read", resource: "posts" }],
      });
      roleId = role.id;
      expect(role.name).toBe("test-editor");
    });

    it("gets a role by id", async () => {
      const role = await rolesProvider.getRole(roleId);
      expect(role).not.toBeNull();
      expect(role?.name).toBe("test-editor");
    });

    it("lists roles", async () => {
      const result = await rolesProvider.listRoles();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it("updates a role", async () => {
      const updated = await rolesProvider.updateRole(roleId, {
        description: "Updated description",
      });
      expect(updated.description).toBe("Updated description");
    });

    it("deletes a role", async () => {
      await rolesProvider.deleteRole(roleId);
      const role = await rolesProvider.getRole(roleId);
      expect(role).toBeNull();
    });
  });

  describe("Firestore Activity Provider", () => {
    it("records and lists activity", async () => {
      await activityProvider.recordActivity({
        action: "create",
        collection: "test-posts",
        userId: "test-user-123",
      });

      const result = await activityProvider.listActivity({ limit: 10 });
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data.some((e) => e.action === "create")).toBe(true);
    });
  });
});
