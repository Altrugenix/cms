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

const base64Img = Buffer.from("fake-image-data").toString("base64");

describe("Media Routes", () => {
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

  describe("Media CRUD", () => {
    let mediaId: string;

    it("POST /api/media creates a media record", async () => {
      const res = await app.inject({
        body: { alt: "Test image", data: base64Img, fileName: "test.png", mimeType: "image/png" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.filename).toContain("media/");
      expect(body.originalName).toBe("test.png");
      expect(body.mimeType).toBe("image/png");
      expect(body.size).toBeGreaterThan(0);
      expect(body.alt).toBe("Test image");
      mediaId = body.id;
    });

    it("POST /api/media rejects missing fields", async () => {
      const res = await app.inject({
        body: { fileName: "test.png" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(400);
    });

    it("POST /api/media rejects empty base64", async () => {
      const res = await app.inject({
        body: { data: "", fileName: "test.png", mimeType: "image/png" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(400);
    });

    it("GET /api/media lists all media", async () => {
      const res = await app.inject({ headers: auth(), method: "GET", url: "/api/media" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.data[0].id).toBe(mediaId);
    });

    it("GET /api/media/:id returns a media record", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/media/${mediaId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).id).toBe(mediaId);
    });

    it("GET /api/media/:id returns 404 for unknown media", async () => {
      const res = await app.inject({ headers: auth(), method: "GET", url: "/api/media/999" });
      expect(res.statusCode).toBe(404);
    });

    it("PATCH /api/media/:id updates metadata", async () => {
      const res = await app.inject({
        body: { alt: "Updated alt" },
        headers: auth(),
        method: "PATCH",
        url: `/api/media/${mediaId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).alt).toBe("Updated alt");
    });

    it("PATCH /api/media/:id returns 404 for unknown media", async () => {
      const res = await app.inject({
        body: { alt: "test" },
        headers: auth(),
        method: "PATCH",
        url: "/api/media/999",
      });
      expect(res.statusCode).toBe(404);
    });

    it("GET /api/media/file/:id serves file stream", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/media/file/${mediaId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(storage.exists).toHaveBeenCalled();
      expect(storage.getStream).toHaveBeenCalled();
    });

    it("GET /api/media/file/:id returns 404 when file missing on storage", async () => {
      vi.mocked(storage.exists).mockResolvedValueOnce(false);
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/media/file/${mediaId}`,
      });
      expect(res.statusCode).toBe(404);
    });

    it("DELETE /api/media/:id deletes media and file", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/media/${mediaId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(storage.delete).toHaveBeenCalled();
    });

    it("DELETE /api/media/:id returns 404 for unknown media", async () => {
      const res = await app.inject({ headers: auth(), method: "DELETE", url: "/api/media/999" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("Folder CRUD", () => {
    let folderId: string;

    it("POST /api/media/folders creates a folder", async () => {
      const res = await app.inject({
        body: { name: "My Folder" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("My Folder");
      folderId = body.id;
    });

    it("POST /api/media/folders rejects empty name", async () => {
      const res = await app.inject({
        body: { name: "" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      expect(res.statusCode).toBe(400);
    });

    it("GET /api/media/folders lists folders", async () => {
      const res = await app.inject({ headers: auth(), method: "GET", url: "/api/media/folders" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/media/folders/:id returns a folder", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/media/folders/${folderId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("My Folder");
    });

    it("GET /api/media/folders/:id returns 404 for unknown folder", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/folders/999",
      });
      expect(res.statusCode).toBe(404);
    });

    it("PATCH /api/media/folders/:id updates folder name", async () => {
      const res = await app.inject({
        body: { name: "Renamed Folder" },
        headers: auth(),
        method: "PATCH",
        url: `/api/media/folders/${folderId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("Renamed Folder");
    });

    it("PATCH /api/media/folders/:id returns 400 for missing fields", async () => {
      const res = await app.inject({
        body: {},
        headers: auth(),
        method: "PATCH",
        url: `/api/media/folders/${folderId}`,
      });
      expect(res.statusCode).toBe(400);
    });

    it("DELETE /api/media/folders/:id deletes a folder", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/media/folders/${folderId}`,
      });
      expect(res.statusCode).toBe(200);
    });

    it("GET /api/media/folders filter by parentId", async () => {
      const parentRes = await app.inject({
        body: { name: "Parent" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const parentId = JSON.parse(parentRes.body).id;

      await app.inject({
        body: { name: "Child", parentId },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/media/folders?parentId=${parentId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.data[0].name).toBe("Child");
    });
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/api/media" });
    expect(res.statusCode).toBe(401);
  });
});
