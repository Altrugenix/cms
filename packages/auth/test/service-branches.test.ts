import { describe, it, expect } from "vitest";
import type { DatabaseAdapter } from "@arche-cms/database";
import { AuthService } from "../src/service.js";

const config = {
  secret: "test-secret-at-least-32-chars-long-for-security!!",
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "7d",
};

describe("AuthService — isAuthUser with numeric id (line 27)", () => {
  it("listUsers handles records with numeric IDs", async () => {
    const numericAdapter = {
      findOne: async () => null,
      findMany: async () => ({
        data: [
          {
            id: 42,
            email: "num@example.com",
            password: "hash",
            role: "editor",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      }),
      create: async (_c: string, data: Record<string, unknown>) => ({ id: 1, ...data }),
      update: async () => null,
      delete: async () => true,
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    } as unknown as DatabaseAdapter;

    const service = new AuthService(numericAdapter, config);
    const users = await service.listUsers();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("num@example.com");
  });

  it("getUser handles records with numeric IDs", async () => {
    const numericAdapter = {
      findOne: async (_c: string, id: string) => {
        if (id === "99") {
          return {
            id: 99,
            email: "num2@example.com",
            password: "hash",
            role: "admin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return null;
      },
      findMany: async () => ({ data: [], total: 0 }),
      create: async (_c: string, data: Record<string, unknown>) => ({ id: 1, ...data }),
      update: async () => null,
      delete: async () => true,
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    } as unknown as DatabaseAdapter;

    const service = new AuthService(numericAdapter, config);
    const user = await service.getUser("99");
    expect(user).not.toBeNull();
    expect(user?.email).toBe("num2@example.com");
  });

  it("me handles records with numeric IDs", async () => {
    const numericAdapter = {
      findOne: async (_c: string, id: string) => {
        if (id === "77") {
          return {
            id: 77,
            email: "me-num@example.com",
            password: "hash",
            role: "editor",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return null;
      },
      findMany: async () => ({ data: [], total: 0 }),
      create: async (_c: string, data: Record<string, unknown>) => ({ id: 1, ...data }),
      update: async () => null,
      delete: async () => true,
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
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
      findOne: async () => null,
      findMany: async (_c: string, _opts?: { where?: Record<string, unknown>; limit?: number }) => {
        if (_c === "__cms_password_resets") {
          return {
            data: [
              {
                id: "r1",
                email: "test@example.com",
                token: 12345,
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
              },
              {
                id: "r2",
                email: "test@example.com",
                token: { nested: "object" },
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
              },
            ],
            total: 2,
          };
        }
        return { data: [], total: 0 };
      },
      create: async () => ({ id: "1" }),
      update: async () => null,
      delete: async () => true,
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    } as unknown as DatabaseAdapter;

    const service = new AuthService(adapter, config);
    await expect(
      service.resetPassword({ token: "some-token", password: "newpass" }),
    ).rejects.toThrow("Invalid or expired reset token");
  });
});

describe("AuthService — updateUser where update returns invalid data (line 233)", () => {
  it("returns null when adapter.update returns null for existing user", async () => {
    const brokenAdapter = {
      findOne: async (_collection: string, id: string) => {
        if (id === "user-1") {
          return { id: "user-1", email: "x@x.com", password: "pw", role: "editor" };
        }
        return null;
      },
      findMany: async () => ({ data: [], total: 0 }),
      create: async () => ({ id: "1" }),
      update: async () => null,
      delete: async () => true,
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    } as unknown as DatabaseAdapter;

    const service = new AuthService(brokenAdapter, config);
    const result = await service.updateUser("user-1", { email: "new@new.com" });
    expect(result).toBeNull();
  });

  it("returns null when adapter.update returns object missing required fields", async () => {
    const brokenAdapter = {
      findOne: async (_collection: string, id: string) => {
        if (id === "user-1") {
          return { id: "user-1", email: "x@x.com", password: "pw", role: "editor" };
        }
        return null;
      },
      findMany: async () => ({ data: [], total: 0 }),
      create: async () => ({ id: "1" }),
      update: async () => ({ id: "user-1" }),
      delete: async () => true,
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    } as unknown as DatabaseAdapter;

    const service = new AuthService(brokenAdapter, config);
    const result = await service.updateUser("user-1", { email: "new@new.com" });
    expect(result).toBeNull();
  });
});
