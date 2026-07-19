import type { DatabaseAdapter } from "@arche-cms/database";
import type { StorageAdapter } from "@arche-cms/storage";
import type { FastifyInstance } from "fastify";

import { Readable } from "node:stream";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const media = new Map<string, Record<string, unknown>>();
  const folders = new Map<string, Record<string, unknown>>();
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  let nextMediaId = 1;
  let nextFolderId = 1;
  let nextUserId = 1;
  let nextRoleId = 1;

  return {
    connect: async () => {},
    create: async (_table: string, data: Record<string, unknown>) => {
      if (_table === "__cms_media") {
        const id = String(nextMediaId++);
        const record = { id, ...data };
        media.set(id, record);
        return record;
      }
      if (_table === "__cms_users") {
        const id = String(nextUserId++);
        const record = { id, ...data };
        users.set(id, record);
        return record;
      }
      if (_table === "__cms_roles") {
        const id = String(nextRoleId++);
        const record = { id, ...data };
        roles.set(id, record);
        return record;
      }
      return {};
    },
    createTable: async () => {},
    delete: async (_table: string, id: string) => {
      if (_table === "__cms_media") return media.delete(id);
      if (_table === "__cms_users") return users.delete(id);
      if (_table === "__cms_roles") return roles.delete(id);
      return true;
    },
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_table: string, options: Record<string, unknown>) => {
      if (_table === "__cms_media") {
        let all = [...media.values()];
        if (options?.where && "folderId" in options.where) {
          const fid = options.where.folderId;
          all = all.filter((r) => {
            if (fid === null || fid === undefined) return r.folderId == null;
            return Number(r.folderId) === Number(fid);
          });
        }
        return { data: all.slice(0, options?.limit ?? 100), total: all.length };
      }
      if (_table === "__cms_users") {
        let all = [...users.values()];
        if (options?.where?.email) {
          all = all.filter((r) => r.email === options.where.email);
        }
        return { data: all.slice(0, options?.limit ?? 100), total: all.length };
      }
      if (_table === "__cms_roles") {
        let all = [...roles.values()];
        if (options?.where?.name) {
          all = all.filter((r) => r.name === options.where.name);
        }
        return { data: all.slice(0, options?.limit ?? 100), total: all.length };
      }
      return { data: [], total: 0 };
    },
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_media") return media.get(id) ?? null;
      if (_table === "__cms_users") return users.get(id) ?? null;
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      return null;
    },
    getExecutedMigrations: async () => [],
    raw: async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO __cms_media_folders")) {
        const id = String(nextFolderId++);
        const now = new Date().toISOString();
        const record = { createdAt: now, id, name: params?.[0], parentId: params?.[1] ?? null };
        folders.set(id, record);
        return [];
      }
      if (sql.includes("SELECT") && sql.includes("__cms_media_folders")) {
        const all = [...folders.values()];
        if (sql.includes("parentId = ?")) {
          const filtered = all.filter((r) => r.parentId === params?.[0]);
          return [filtered].flat().slice(0, 100);
        }
        if (sql.includes("parentId IS NULL")) {
          const filtered = all.filter((r) => r.parentId == null);
          return [filtered].flat().slice(0, 100);
        }
        if (sql.includes("WHERE id = ?")) {
          const found = all.find((r) => Number(r.id) === Number(params?.[0]));
          return found ? [found] : [];
        }
        return all;
      }
      if (sql.includes("UPDATE __cms_media SET folderId = NULL WHERE folderId = ?")) {
        for (const [k, v] of media) {
          if (Number(v.folderId) === Number(params?.[0])) {
            media.set(k, { ...v, folderId: null });
          }
        }
        return [];
      }
      if (sql.includes("UPDATE __cms_media_folders SET parentId = NULL WHERE parentId = ?")) {
        for (const [k, v] of folders) {
          if (Number(v.parentId) === Number(params?.[0])) {
            folders.set(k, { ...v, parentId: null });
          }
        }
        return [];
      }
      if (sql.includes("DELETE FROM __cms_media_folders WHERE id = ?")) {
        folders.delete(String(params?.[0]));
        return [];
      }
      if (sql.includes("UPDATE __cms_media_folders SET")) {
        const id = params?.[params.length - 1];
        const existing = folders.get(String(id));
        if (existing) {
          const updates: Record<string, unknown> = {};
          const sets = sql.match(/(\w+)\s*=\s*\?/g);
          let paramIdx = 0;
          if (sets) {
            for (const setClause of sets) {
              const col = setClause.split("=")[0].trim();
              if (col === "name" && params?.[paramIdx] !== undefined) {
                updates.name = params[paramIdx];
              }
              if (col === "parentId" && params?.[paramIdx] !== undefined) {
                updates.parentId = params[paramIdx] !== null ? Number(params[paramIdx]) : null;
              }
              paramIdx++;
            }
          }
          const updated = { ...existing, ...updates };
          folders.set(String(id), updated);
        }
        return [];
      }
      if (sql.includes("ALTER TABLE")) return [];
      if (sql.includes("SELECT") && sql.includes("__cms_media")) {
        const all = [...media.values()];
        if (sql.includes('"folderId" IS NULL')) {
          const filtered = all.filter((r) => r.folderId == null);
          return [filtered].flat().slice(0, 100);
        }
        return all;
      }
      return [];
    },
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async (_table: string, id: string, data: Record<string, unknown>) => {
      if (_table === "__cms_media") {
        const existing = media.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        media.set(id, updated);
        return updated;
      }
      if (_table === "__cms_users") {
        const existing = users.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        users.set(id, updated);
        return updated;
      }
      if (_table === "__cms_roles") {
        const existing = roles.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        roles.set(id, updated);
        return updated;
      }
      return null;
    },
  };
}

function createMockStorage(): StorageAdapter {
  return {
    delete: vi.fn().mockResolvedValue(true),
    exists: vi.fn().mockResolvedValue(true),
    getStream: vi.fn().mockResolvedValue(Readable.from(Buffer.from("fake-file-content"))),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

const testConfig: ServerConfig = {
  auth: {
    accessTokenExpiresIn: "15m",
    adminPassword: "admin123",
    refreshTokenExpiresIn: "7d",
    secret: "test-secret-at-least-32-chars-long-for-security!!",
  },
  cors: { origin: "*" },
  database: { adapter: "sqlite", url: ":memory:" },
  host: "localhost",
  logger: { level: "silent" },
  port: 0,
  rateLimit: { max: 1000, timeWindow: "1 minute" },
  schema: { baseDir: "./cms" },
  storage: { baseDir: "./uploads" },
  swagger: { description: "Test", title: "Test", version: "1.0.0" },
};

describe("Media Routes — extra 2 (folder parentId handling)", () => {
  let app: FastifyInstance;
  let authToken: string;
  let storage: StorageAdapter;

  beforeAll(async () => {
    storage = createMockStorage();
    app = await createApp({
      adapter: createMockAdapter(),
      collections: [],
      config: testConfig,
      storageAdapter: storage,
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${authToken}` });

  describe("GET /api/media/folders — parentId filtering", () => {
    let parentId: string;

    beforeAll(async () => {
      const parentRes = await app.inject({
        body: { name: "Parent Folder" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      parentId = JSON.parse(parentRes.body).id;

      await app.inject({
        body: { name: "Child Folder A", parentId },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      await app.inject({
        body: { name: "Child Folder B", parentId },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
    });

    it("returns children for valid parentId", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/media/folders?parentId=${parentId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(2);
      expect(
        body.data.every((f: { parentId: string | number }) => f.parentId === Number(parentId)),
      ).toBe(true);
    });

    it("returns 400 for invalid parentId", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/folders?parentId=abc",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe("Invalid parentId");
    });

    it("returns root folders for empty parentId", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/folders?parentId=",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns root folders for parentId=null", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/folders?parentId=null",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
    });

    it("returns all folders when no parentId is specified", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/folders",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe("PATCH /api/media/folders/:id — parentId update", () => {
    it("updates folder parentId to another folder", async () => {
      const parentRes = await app.inject({
        body: { name: "New Parent" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const newParentId = JSON.parse(parentRes.body).id;

      const childRes = await app.inject({
        body: { name: "Reparent Me" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const childId = JSON.parse(childRes.body).id;

      const res = await app.inject({
        body: { parentId: Number(newParentId) },
        headers: auth(),
        method: "PATCH",
        url: `/api/media/folders/${childId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.parentId).toBe(Number(newParentId));
    });

    it("sets folder parentId to null (move to root)", async () => {
      const parentRes = await app.inject({
        body: { name: "Temp Parent" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const parentId = JSON.parse(parentRes.body).id;

      const childRes = await app.inject({
        body: { name: "Move to Root", parentId },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const childId = JSON.parse(childRes.body).id;

      const res = await app.inject({
        body: { parentId: null },
        headers: auth(),
        method: "PATCH",
        url: `/api/media/folders/${childId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.parentId).toBeNull();
    });
  });
});
