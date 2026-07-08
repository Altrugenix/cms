import { describe, it, expect, beforeEach } from "vitest";
import type { DatabaseAdapter } from "@altrugenix/database";
import { AuthService } from "../src/service.js";

const config = {
  secret: "test-secret-at-least-32-chars-long-for-security!!",
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "7d",
};

function createMockAdapter(): DatabaseAdapter {
  const store = new Map<string, Record<string, unknown>>();
  let nextId = 1;

  return {
    findOne: async (collection, id) => store.get(id) ?? null,
    findMany: async (_collection, options) => {
      const all = [...store.values()];
      const email = options?.where?.email;
      const filtered = email ? all.filter((r) => r.email === email) : all;
      return { data: filtered.slice(0, options?.limit ?? 100), total: filtered.length };
    },
    create: async (_collection, data) => {
      const id = String(nextId++);
      const record = { id, ...data };
      store.set(id, record);
      return record;
    },
    update: async (_collection, id, data) => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      store.set(id, updated);
      return updated;
    },
    delete: async () => true,
    connect: async () => {},
    disconnect: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    raw: async () => [],
    createTable: async () => {},
    dropTable: async () => {},
    runMigration: async () => {},
    getExecutedMigrations: async () => [],
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let adapter: DatabaseAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    service = new AuthService(adapter, config);
  });

  describe("register", () => {
    it("registers a new user and returns user + tokens", async () => {
      const result = await service.register({ email: "new@example.com", password: "pass123" });
      expect(result.user.email).toBe("new@example.com");
      expect(result.user.role).toBe("editor");
      expect(result.user).not.toHaveProperty("password");
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
    });

    it("throws if email already exists", async () => {
      await service.register({ email: "dup@example.com", password: "pass123" });
      await expect(
        service.register({ email: "dup@example.com", password: "pass456" }),
      ).rejects.toThrow("already exists");
    });

    it("accepts custom role", async () => {
      const result = await service.register({
        email: "admin@example.com",
        password: "pass123",
        role: "admin",
      });
      expect(result.user.role).toBe("admin");
    });
  });

  describe("login", () => {
    it("logs in with correct credentials", async () => {
      await service.register({ email: "login@example.com", password: "correct" });
      const result = await service.login({ email: "login@example.com", password: "correct" });
      expect(result.user.email).toBe("login@example.com");
      expect(result.tokens.accessToken).toBeTruthy();
    });

    it("throws on wrong password", async () => {
      await service.register({ email: "secure@example.com", password: "real-pass" });
      await expect(
        service.login({ email: "secure@example.com", password: "wrong-pass" }),
      ).rejects.toThrow("Invalid email or password");
    });

    it("throws on unknown email", async () => {
      await expect(service.login({ email: "nobody@example.com", password: "any" })).rejects.toThrow(
        "Invalid email or password",
      );
    });
  });

  describe("refresh", () => {
    it("returns new tokens from a valid refresh token", async () => {
      const { tokens } = await service.register({ email: "refresh@example.com", password: "pass" });
      const newTokens = await service.refresh(tokens.refreshToken);
      expect(newTokens.accessToken).toBeTruthy();
      expect(newTokens.refreshToken).toBeTruthy();
    });

    it("throws on invalid refresh token", async () => {
      await expect(service.refresh("invalid-token")).rejects.toThrow();
    });
  });

  describe("me", () => {
    it("returns public user for valid id", async () => {
      const { user } = await service.register({ email: "me@example.com", password: "pass" });
      const me = await service.me(user.id);
      expect(me).not.toBeNull();
      expect(me?.email).toBe("me@example.com");
    });

    it("returns null for unknown id", async () => {
      const me = await service.me("nonexistent");
      expect(me).toBeNull();
    });
  });
});
