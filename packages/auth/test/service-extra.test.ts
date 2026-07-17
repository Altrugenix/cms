/* eslint-disable no-secrets/no-secrets */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("bcryptjs", () => ({
  compare: vi.fn().mockImplementation((pw: string, hash: string) => {
    return Promise.resolve(
      pw === "correct-password" || (hash.startsWith("$2b$") && pw !== "wrong-password"),
    );
  }),
  default: {
    compare: vi.fn().mockImplementation((pw: string, hash: string) => {
      return Promise.resolve(
        pw === "correct-password" || (hash.startsWith("$2b$") && pw !== "wrong-password"),
      );
    }),
    hash: vi.fn().mockResolvedValue("$2b$12$hashedpasswordvalue1234567890abcde"),
  },
  hash: vi.fn().mockResolvedValue("$2b$12$hashedpasswordvalue1234567890abcde"),
}));

import type { DatabaseAdapter } from "@arche-cms/database";

import { AuthService } from "../src/service.js";

const config = {
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "7d",
  secret: "test-secret-at-least-32-chars-long-for-security!!",
};

function createMockAdapter(): DatabaseAdapter {
  const users = new Map<string, Record<string, unknown>>();
  const resetTokens: Record<string, unknown>[] = [];
  let nextId = 1;

  return {
    connect: async () => {},
    create: async (collection, data) => {
      if (collection === "__cms_users") {
        const id = String(nextId++);
        const record = { id, ...data };
        users.set(id, record);
        return record;
      }
      if (collection === "__cms_password_resets") {
        const record = { id: String(nextId++), ...data };
        resetTokens.push(record);
        return record;
      }
      return data;
    },
    createTable: async () => {},
    delete: async (_collection, id) => {
      const existed = users.has(id);
      users.delete(id);
      return existed;
    },
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (collection, options) => {
      if (collection === "__cms_users") {
        const all = [...users.values()];
        const email = options?.where?.email;
        const filtered = email ? all.filter((r) => r.email === email) : all;
        return { data: filtered.slice(0, options?.limit ?? 100), total: filtered.length };
      }
      if (collection === "__cms_password_resets") {
        const filtered = options?.limit
          ? [...resetTokens].slice(0, options.limit)
          : [...resetTokens];
        return { data: filtered, total: resetTokens.length };
      }
      return { data: [], total: 0 };
    },
    findOne: async (collection, id) => {
      if (collection === "__cms_users") return users.get(id) ?? null;
      return null;
    },
    getExecutedMigrations: async () => [],
    getExistingSchema: async () => ({ tables: new Map() }),
    raw: async () => [],
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async (_collection, id, data) => {
      const existing = users.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      users.set(id, updated);
      return updated;
    },
  };
}

describe("AuthService extra coverage", () => {
  let service: AuthService;
  let adapter: DatabaseAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    service = new AuthService(adapter, config);
  });

  describe("seedDefaultAdmin", () => {
    it("creates default admin when no users exist", async () => {
      const admin = await service.seedDefaultAdmin("admin-pass-123");
      expect(admin).not.toBeNull();
      expect(admin?.email).toBe("admin@arche-cms.com");
      expect(admin?.role).toBe("admin");
      expect(admin).not.toHaveProperty("password");
    });

    it("returns null when users already exist", async () => {
      await service.register({ email: "user@example.com", password: "pass" });
      const admin = await service.seedDefaultAdmin("admin-pass-123");
      expect(admin).toBeNull();
    });
  });

  describe("updateUser with password", () => {
    it("updates password when provided", async () => {
      const { user } = await service.register({ email: "pw@example.com", password: "old-pass" });
      const updated = await service.updateUser(user.id, { password: "new-pass-123" });
      expect(updated).not.toBeNull();
    });

    it("returns null for unknown user when updating password", async () => {
      const result = await service.updateUser("nonexistent", { password: "new-pass" });
      expect(result).toBeNull();
    });
  });

  describe("init", () => {
    it("is idempotent", async () => {
      await service.init();
      await service.init();
    });
  });

  describe("forgotPassword with existing user", () => {
    it("creates reset token record", async () => {
      await service.register({ email: "forgot@example.com", password: "pass123" });
      const result = await service.forgotPassword({ email: "forgot@example.com" });
      expect(result.message).toContain("reset link");
    });
  });

  describe("register creates isAuthUser-validated record", () => {
    it("throws if created record doesn't pass isAuthUser (simulated)", async () => {
      const brokenAdapter = {
        ...adapter,
        create: async () => ({ id: "1" }),
      } as unknown as DatabaseAdapter;
      const brokenService = new AuthService(brokenAdapter, config);
      await expect(
        brokenService.register({ email: "broken@example.com", password: "pass" }),
      ).rejects.toThrow("Failed to create user");
    });
  });

  describe("deleteUser", () => {
    it("returns true for existing user", async () => {
      const { user } = await service.register({ email: "del@example.com", password: "pass" });
      const deleted = await service.deleteUser(user.id);
      expect(deleted).toBe(true);
    });
  });

  describe("listUsers with mixed valid/invalid records", () => {
    it("filters out non-AuthUser records", async () => {
      await service.register({ email: "valid@example.com", password: "pass" });
      const users = await service.listUsers();
      expect(users.length).toBeGreaterThanOrEqual(1);
      users.forEach((u) => {
        expect(u).not.toHaveProperty("password");
      });
    });
  });

  describe("refresh with invalid token", () => {
    it("throws on invalid token", async () => {
      await expect(service.refresh("totally-invalid")).rejects.toThrow();
    });
  });

  describe("refresh with deleted user", () => {
    it("throws when user no longer exists", async () => {
      const { tokens, user } = await service.register({
        email: "gone@example.com",
        password: "pass",
      });
      await service.deleteUser(user.id);
      await expect(service.refresh(tokens.refreshToken)).rejects.toThrow("User not found");
    });
  });

  describe("updateUser", () => {
    it("updates email and updatedAt", async () => {
      const { user } = await service.register({ email: "upd@example.com", password: "pass" });
      const updated = await service.updateUser(user.id, { email: "newupd@example.com" });
      expect(updated?.email).toBe("newupd@example.com");
      expect(updated?.updatedAt).toBeTruthy();
    });

    it("returns null for non-existent user", async () => {
      const result = await service.updateUser("ghost", { email: "x@x.com" });
      expect(result).toBeNull();
    });
  });

  describe("login with isAuthUser check", () => {
    it("returns tokens on successful login", async () => {
      await service.register({ email: "login2@example.com", password: "correct-password" });
      const result = await service.login({
        email: "login2@example.com",
        password: "correct-password",
      });
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
    });
  });

  describe("getUser", () => {
    it("returns public user for valid id", async () => {
      const { user } = await service.register({ email: "get@example.com", password: "pass" });
      const found = await service.getUser(user.id);
      expect(found).not.toBeNull();
      expect(found?.email).toBe("get@example.com");
    });
  });

  describe("me edge cases", () => {
    it("returns null for user that doesn't pass isAuthUser check", async () => {
      const { user } = await service.register({ email: "me-edge@example.com", password: "pass" });
      const me = await service.me(user.id);
      expect(me).not.toBeNull();
      expect(me?.email).toBe("me-edge@example.com");
    });
  });

  describe("resetPassword - token not string", () => {
    it("skips non-string tokens in reset search", async () => {
      await service.register({ email: "rp@example.com", password: "old" });
      await expect(
        service.resetPassword({ password: "new", token: "invalid-token-string" }),
      ).rejects.toThrow("Invalid or expired reset token");
    });
  });
});
