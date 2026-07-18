import type { DatabaseAdapter } from "@arche-cms/database";

import { describe, it, expect } from "vitest";

import { AuthService } from "../src/service.js";

const config = {
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "7d",
  secret: "test-secret-at-least-32-chars-long-for-security!!",
};

describe("AuthService — isAuthUser with numeric id (line 27)", () => {
  it("listUsers handles records with numeric IDs", async () => {
    const numericAdapter = {
      connect: async () => {},
      create: async (_c: string, data: Record<string, unknown>) => ({ id: 1, ...data }),
      createTable: async () => {},
      delete: async () => true,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async () => ({
        data: [
          {
            createdAt: new Date().toISOString(),
            email: "num@example.com",
            id: 42,
            password: "hash",
            role: "editor",
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      }),
      findOne: async () => null,
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async () => null,
    } as unknown as DatabaseAdapter;

    const service = new AuthService(numericAdapter, config);
    const users = await service.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("num@example.com");
  });

  it("getUser handles records with numeric IDs", async () => {
    const numericAdapter = {
      connect: async () => {},
      create: async (_c: string, data: Record<string, unknown>) => ({ id: 1, ...data }),
      createTable: async () => {},
      delete: async () => true,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async () => ({ data: [], total: 0 }),
      findOne: async (_c: string, id: string) => {
        if (id === "99") {
          return {
            createdAt: new Date().toISOString(),
            email: "num2@example.com",
            id: 99,
            password: "hash",
            role: "admin",
            updatedAt: new Date().toISOString(),
          };
        }
        return null;
      },
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async () => null,
    } as unknown as DatabaseAdapter;

    const service = new AuthService(numericAdapter, config);
    const user = await service.getUser("99");
    expect(user).not.toBeNull();
    expect(user?.email).toBe("num2@example.com");
  });

  it("me handles records with numeric IDs", async () => {
    const numericAdapter = {
      connect: async () => {},
      create: async (_c: string, data: Record<string, unknown>) => ({ id: 1, ...data }),
      createTable: async () => {},
      delete: async () => true,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async () => ({ data: [], total: 0 }),
      findOne: async (_c: string, id: string) => {
        if (id === "77") {
          return {
            createdAt: new Date().toISOString(),
            email: "me-num@example.com",
            id: 77,
            password: "hash",
            role: "editor",
            updatedAt: new Date().toISOString(),
          };
        }
        return null;
      },
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async () => null,
    } as unknown as DatabaseAdapter;

    const service = new AuthService(numericAdapter, config);
    const user = await service.me("77");
    expect(user).not.toBeNull();
    expect(user?.email).toBe("me-num@example.com");
  });
});

describe("AuthService — resetPassword with non-string token (line 175)", () => {
  it("skips records where token is not a string and eventually fails", async () => {
    const adapter = {
      connect: async () => {},
      create: async () => ({ id: "1" }),
      createTable: async () => {},
      delete: async () => true,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async (_c: string, _opts?: { where?: Record<string, unknown>; limit?: number }) => {
        if (_c === "__cms_password_resets") {
          return {
            data: [
              {
                email: "test@example.com",
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                id: "r1",
                token: 12345,
              },
              {
                email: "test@example.com",
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                id: "r2",
                token: { nested: "object" },
              },
            ],
            total: 2,
          };
        }
        return { data: [], total: 0 };
      },
      findOne: async () => null,
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async () => null,
    } as unknown as DatabaseAdapter;

    const service = new AuthService(adapter, config);
    await expect(
      service.resetPassword({ password: "newpass", token: "some-token" }),
    ).rejects.toThrow("Invalid or expired reset token");
  });
});

describe("AuthService — updateUser where update returns invalid data (line 233)", () => {
  it("returns null when adapter.update returns null for existing user", async () => {
    const brokenAdapter = {
      connect: async () => {},
      create: async () => ({ id: "1" }),
      createTable: async () => {},
      delete: async () => true,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async () => ({ data: [], total: 0 }),
      findOne: async (_collection: string, id: string) => {
        if (id === "user-1") {
          return { email: "x@x.com", id: "user-1", password: "pw", role: "editor" };
        }
        return null;
      },
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async () => null,
    } as unknown as DatabaseAdapter;

    const service = new AuthService(brokenAdapter, config);
    const result = await service.updateUser("user-1", { email: "new@new.com" });
    expect(result).toBeNull();
  });

  it("returns null when adapter.update returns object missing required fields", async () => {
    const brokenAdapter = {
      connect: async () => {},
      create: async () => ({ id: "1" }),
      createTable: async () => {},
      delete: async () => true,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async () => ({ data: [], total: 0 }),
      findOne: async (_collection: string, id: string) => {
        if (id === "user-1") {
          return { email: "x@x.com", id: "user-1", password: "pw", role: "editor" };
        }
        return null;
      },
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async () => ({ id: "user-1" }),
    } as unknown as DatabaseAdapter;

    const service = new AuthService(brokenAdapter, config);
    const result = await service.updateUser("user-1", { email: "new@new.com" });
    expect(result).toBeNull();
  });
});
