import type { AdminProvider } from "../../src/lib/providers/types";

/**
 * Provider contract test.
 *
 * This file verifies that a provider implementation satisfies the
 * AdminProvider interface at the type level. Both REST and Firebase
 * providers must pass these structural checks.
 *
 * The test instantiates the provider factory and asserts that every
 * required namespace and method exists with the correct shape.
 */

function assertAdminProvider(provider: AdminProvider, label: string) {
  describe(`${label} — AdminProvider contract`, () => {
    it("has auth namespace", () => {
      expect(provider.auth).toBeDefined();
      expect(typeof provider.auth.login).toBe("function");
      expect(typeof provider.auth.register).toBe("function");
      expect(typeof provider.auth.logout).toBe("function");
      expect(typeof provider.auth.getCurrentUser).toBe("function");
      expect(typeof provider.auth.forgotPassword).toBe("function");
      expect(typeof provider.auth.resetPassword).toBe("function");
    });

    it("has collections namespace", () => {
      expect(provider.collections).toBeDefined();
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

    it("has globals namespace", () => {
      expect(provider.globals).toBeDefined();
      expect(typeof provider.globals.getGlobal).toBe("function");
      expect(typeof provider.globals.upsertGlobal).toBe("function");
    });

    it("has media namespace", () => {
      expect(provider.media).toBeDefined();
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

    it("has users namespace", () => {
      expect(provider.users).toBeDefined();
      expect(typeof provider.users.listUsers).toBe("function");
      expect(typeof provider.users.getUser).toBe("function");
      expect(typeof provider.users.createUser).toBe("function");
      expect(typeof provider.users.updateUser).toBe("function");
      expect(typeof provider.users.deleteUser).toBe("function");
    });

    it("has roles namespace", () => {
      expect(provider.roles).toBeDefined();
      expect(typeof provider.roles.listRoles).toBe("function");
      expect(typeof provider.roles.getRole).toBe("function");
      expect(typeof provider.roles.createRole).toBe("function");
      expect(typeof provider.roles.updateRole).toBe("function");
      expect(typeof provider.roles.deleteRole).toBe("function");
    });

    it("has activity namespace", () => {
      expect(provider.activity).toBeDefined();
      expect(typeof provider.activity.listActivity).toBe("function");
    });

    it("has settings namespace", () => {
      expect(provider.settings).toBeDefined();
      expect(typeof provider.settings.listApiTokens).toBe("function");
      expect(typeof provider.settings.createApiToken).toBe("function");
      expect(typeof provider.settings.deleteApiToken).toBe("function");
      expect(typeof provider.settings.listWebhooks).toBe("function");
      expect(typeof provider.settings.getWebhook).toBe("function");
      expect(typeof provider.settings.createWebhook).toBe("function");
      expect(typeof provider.settings.updateWebhook).toBe("function");
      expect(typeof provider.settings.deleteWebhook).toBe("function");
    });
  });
}

// ─── REST Provider ───────────────────────────────────────────────────────────

describe("REST provider contract", () => {
  // eslint-disable-next-line vitest/expect-expect
  it("createRestProvider returns a valid AdminProvider", async () => {
    const { createRestProvider } = await import("../../src/lib/providers/rest");
    const provider = createRestProvider();
    assertAdminProvider(provider, "REST");
  });
});

// ─── Firebase Provider ───────────────────────────────────────────────────────

describe("Firebase provider contract", () => {
  // eslint-disable-next-line vitest/expect-expect
  it("createFirebaseProvider returns a valid AdminProvider", async () => {
    const { createFirebaseProvider } = await import("@arche-cms/cms-firebase");
    const provider = createFirebaseProvider({
      activity: {} as never,
      apiTokens: {} as never,
      auth: {} as never,
      content: {} as never,
      globals: {} as never,
      roles: {} as never,
      storage: {} as never,
      users: {} as never,
      webhooks: {} as never,
    });
    assertAdminProvider(provider, "Firebase");
  });
});
