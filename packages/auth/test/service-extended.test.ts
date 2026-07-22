import type { DatabaseAdapter } from "@arche-cms/database";

import { randomBytes } from "node:crypto";
import { describe, it, expect, beforeEach } from "vitest";

import { hashPassword } from "../src/password.js";
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
        return { data: [...resetTokens], total: resetTokens.length };
      }
      return { data: [], total: 0 };
    },
    findOne: async (collection, id) => {
      if (collection === "__cms_users") return users.get(id) ?? null;
      return null;
    },
    getExecutedMigrations: async () => [],
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

describe("AuthService extended", () => {
  let service: AuthService;
  let adapter: DatabaseAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    service = new AuthService(adapter, config);
  });

  describe("forgotPassword", () => {
    it("returns generic message for any email", async () => {
      await service.register({ email: "test@example.com", password: "pass123" });
      const result = await service.forgotPassword({ email: "test@example.com" });
      expect(result.message).toContain("reset link");
      expect(result).not.toHaveProperty("resetToken");
    });

    it("returns generic message for unregistered email", async () => {
      const result = await service.forgotPassword({ email: "unknown@example.com" });
      expect(result.message).toContain("reset link");
      expect(result).not.toHaveProperty("resetToken");
    });
  });

  describe("resetPassword", () => {
    it("resets password with a valid token", async () => {
      await service.register({ email: "reset@example.com", password: "oldpass" });

      const rawToken = randomBytes(32).toString("hex");
      const hashedToken = await hashPassword(rawToken);
      await adapter.create("__cms_password_resets", {
        email: "reset@example.com",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        token: hashedToken,
      });

      const result = await service.resetPassword({ password: "newpass", token: rawToken });
      expect(result.message).toContain("reset");
      await expect(
        service.login({ email: "reset@example.com", password: "newpass" }),
      ).resolves.toBeTruthy();
    });

    it("throws for invalid token", async () => {
      await expect(
        service.resetPassword({ password: "newpass", token: "invalid-token" }),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("throws for expired token", async () => {
      await service.register({ email: "expired@example.com", password: "oldpass" });

      const rawToken = randomBytes(32).toString("hex");
      const hashedToken = await hashPassword(rawToken);
      await adapter.create("__cms_password_resets", {
        email: "expired@example.com",
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
        token: hashedToken,
      });

      await expect(service.resetPassword({ password: "newpass", token: rawToken })).rejects.toThrow(
        "Reset token has expired",
      );
    });

    it("throws if user is deleted before reset", async () => {
      await service.register({ email: "deleted@example.com", password: "oldpass" });

      const rawToken = randomBytes(32).toString("hex");
      const hashedToken = await hashPassword(rawToken);
      await adapter.create("__cms_password_resets", {
        email: "deleted@example.com",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        token: hashedToken,
      });

      const users = await service.listUsers();
      await service.deleteUser(users[0].id);

      await expect(service.resetPassword({ password: "newpass", token: rawToken })).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("listUsers", () => {
    it("returns all public users without passwords", async () => {
      await service.register({ email: "a@example.com", password: "pass" });
      await service.register({ email: "b@example.com", password: "pass" });

      const users = await service.listUsers();
      expect(users).toHaveLength(2);
      expect(users[0]).not.toHaveProperty("password");
      expect(users.map((u) => u.email).sort()).toEqual(["a@example.com", "b@example.com"]);
    });

    it("returns empty array when no users exist", async () => {
      const users = await service.listUsers();
      expect(users).toEqual([]);
    });
  });

  describe("getUser", () => {
    it("returns a public user by id", async () => {
      const { user } = await service.register({ email: "get@example.com", password: "pass" });
      const found = await service.getUser(user.id);
      expect(found).not.toBeNull();
      expect(found?.email).toBe("get@example.com");
      expect(found).not.toHaveProperty("password");
    });

    it("returns null for unknown id", async () => {
      const found = await service.getUser("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("updates user email", async () => {
      const { user } = await service.register({ email: "old@example.com", password: "pass" });
      const updated = await service.updateUser(user.id, { email: "new@example.com" });
      expect(updated?.email).toBe("new@example.com");
    });

    it("updates user role", async () => {
      const { user } = await service.register({ email: "role@example.com", password: "pass" });
      const updated = await service.updateUser(user.id, { role: "admin" });
      expect(updated?.role).toBe("admin");
    });

    it("returns null for unknown user", async () => {
      const updated = await service.updateUser("nonexistent", { email: "x@example.com" });
      expect(updated).toBeNull();
    });

    it("persists name field via register and updateUser", async () => {
      const { user } = await service.register({
        email: "named@example.com",
        name: "John Doe",
        password: "pass",
      });
      expect(user.name).toBe("John Doe");

      const updated = await service.updateUser(user.id, { name: "Jane Doe" });
      expect(updated?.name).toBe("Jane Doe");
    });

    it("updates password via updateUser", async () => {
      const { user } = await service.register({ email: "pw@example.com", password: "oldpass" });
      const updated = await service.updateUser(user.id, { password: "newpass" });
      expect(updated).not.toBeNull();
      const loginResult = await service.login({ email: "pw@example.com", password: "newpass" });
      expect(loginResult.user.id).toBe(user.id);
    });
  });

  describe("deleteUser", () => {
    it("deletes a user and returns true", async () => {
      const { user } = await service.register({ email: "delete@example.com", password: "pass" });
      const deleted = await service.deleteUser(user.id);
      expect(deleted).toBe(true);
      const found = await service.getUser(user.id);
      expect(found).toBeNull();
    });

    it("returns false for unknown user", async () => {
      const deleted = await service.deleteUser("nonexistent");
      expect(deleted).toBe(false);
    });
  });
});
