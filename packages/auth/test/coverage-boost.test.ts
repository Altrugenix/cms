import type { DatabaseAdapter } from "@arche-cms/database";

import { jwtVerify } from "jose";
import { describe, it, expect, beforeEach } from "vitest";

import { AuthService } from "../src/service.js";

const config = {
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "7d",
  secret: "test-secret-at-least-32-chars-long-for-security!!",
};

const secretKey = new TextEncoder().encode(config.secret);

function createMockAdapter(): DatabaseAdapter {
  const store = new Map<string, Record<string, unknown>>();
  let nextId = 1;

  return {
    connect: async () => {},
    create: async (_collection, data) => {
      const id = String(nextId++);
      const record = { id, ...data };
      store.set(id, record);
      return record;
    },
    createTable: async () => {},
    delete: async () => true,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_collection, options) => {
      const all = [...store.values()];
      const email = options?.where?.email;
      const filtered = email ? all.filter((r) => r.email === email) : all;
      return { data: filtered.slice(0, options?.limit ?? 100), total: filtered.length };
    },
    findOne: async (_collection, id) => store.get(id) ?? null,
    getExecutedMigrations: async () => [],
    raw: async () => [],
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async (_collection, id, data) => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      store.set(id, updated);
      return updated;
    },
  };
}

describe("AuthService — rememberMe branch", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(createMockAdapter(), config);
  });

  it("issues a long-lived refresh token when rememberMe is true", async () => {
    await service.register({ email: "long@example.com", password: "pass1234" });
    const result = await service.login({
      email: "long@example.com",
      password: "pass1234",
      rememberMe: true,
    });

    const { payload } = await jwtVerify(result.tokens.refreshToken, secretKey);
    const exp = payload.exp as number;
    const iat = payload.iat as number;
    const expirySeconds = exp - iat;

    expect(expirySeconds).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 - 5);
    expect(expirySeconds).toBeLessThanOrEqual(30 * 24 * 60 * 60 + 5);
    expect(payload.type).toBe("refresh");
  });

  it("issues a short-lived refresh token when rememberMe is false", async () => {
    await service.register({ email: "short@example.com", password: "pass1234" });
    const result = await service.login({
      email: "short@example.com",
      password: "pass1234",
      rememberMe: false,
    });

    const { payload } = await jwtVerify(result.tokens.refreshToken, secretKey);
    const exp = payload.exp as number;
    const iat = payload.iat as number;
    const expirySeconds = exp - iat;

    expect(expirySeconds).toBeGreaterThanOrEqual(60 * 60 - 5);
    expect(expirySeconds).toBeLessThanOrEqual(60 * 60 + 5);
  });

  it("issues a short-lived refresh token when rememberMe is omitted", async () => {
    await service.register({ email: "default@example.com", password: "pass1234" });
    const result = await service.login({
      email: "default@example.com",
      password: "pass1234",
    });

    const { payload } = await jwtVerify(result.tokens.refreshToken, secretKey);
    const exp = payload.exp as number;
    const iat = payload.iat as number;
    const expirySeconds = exp - iat;

    expect(expirySeconds).toBeGreaterThanOrEqual(60 * 60 - 5);
    expect(expirySeconds).toBeLessThanOrEqual(60 * 60 + 5);
  });
});
