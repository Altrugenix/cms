import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Readable } from "node:stream";
import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { StorageAdapter } from "@arche-cms/storage";
import { createApp } from "../src/server/app.js";
import type { ServerConfig } from "../src/server/config.js";

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
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_media") return media.get(id) ?? null;
      if (_table === "__cms_users") return users.get(id) ?? null;
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      return null;
    },
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
    delete: async (_table: string, id: string) => {
      if (_table === "__cms_media") return media.delete(id);
      if (_table === "__cms_users") return users.delete(id);
      if (_table === "__cms_roles") return roles.delete(id);
      return true;
    },
    deleteMany: async () => 0,
    connect: async () => {},
    disconnect: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    raw: async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO __cms_media_folders")) {
        const id = String(nextFolderId++);
        const now = new Date().toISOString();
        const record = { id, name: params?.[0], parentId: params?.[1] ?? null, createdAt: now };
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
    createTable: async () => {},
    dropTable: async () => {},
    runMigration: async () => {},
    getExecutedMigrations: async () => [],
  };
}

function createMockStorage(): StorageAdapter {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    getStream: vi.fn().mockResolvedValue(Readable.from(Buffer.from("fake-file-content"))),
    exists: vi.fn().mockResolvedValue(true),
  };
}

const testConfig: ServerConfig = {
  port: 0,
  host: "localhost",
  logger: { level: "silent" },
  cors: { origin: "*" },
  rateLimit: { max: 1000, timeWindow: "1 minute" },
  swagger: { title: "Test", version: "1.0.0", description: "Test" },
  schema: { baseDir: "./cms" },
  database: { adapter: "sqlite", url: ":memory:" },
  auth: {
    secret: "test-secret-at-least-32-chars-long-for-security!!",
    accessTokenExpiresIn: "15m",
    refreshTokenExpiresIn: "7d",
  },
  storage: { baseDir: "./uploads" },
};

const base64Img = Buffer.from("fake-image-data").toString("base64");

describe("Media Routes", () => {
  let app: FastifyInstance;
  let authToken: string;
  let storage: StorageAdapter;

  beforeAll(async () => {
    storage = createMockStorage();
    app = await createApp({
      config: testConfig,
      adapter: createMockAdapter(),
      storageAdapter: storage,
      collections: [],
    });
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { email: "admin@arche-cms.com", password: "admin123" },
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
        method: "POST",
        url: "/api/media",
        headers: auth(),
        body: { fileName: "test.png", mimeType: "image/png", data: base64Img, alt: "Test image" },
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
        method: "POST",
        url: "/api/media",
        headers: auth(),
        body: { fileName: "test.png" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("POST /api/media rejects empty base64", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/media",
        headers: auth(),
        body: { fileName: "test.png", mimeType: "image/png", data: "" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("GET /api/media lists all media", async () => {
      const res = await app.inject({ method: "GET", url: "/api/media", headers: auth() });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.data[0].id).toBe(mediaId);
    });

    it("GET /api/media/:id returns a media record", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/media/${mediaId}`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).id).toBe(mediaId);
    });

    it("GET /api/media/:id returns 404 for unknown media", async () => {
      const res = await app.inject({ method: "GET", url: "/api/media/999", headers: auth() });
      expect(res.statusCode).toBe(404);
    });

    it("PATCH /api/media/:id updates metadata", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/media/${mediaId}`,
        headers: auth(),
        body: { alt: "Updated alt" },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).alt).toBe("Updated alt");
    });

    it("PATCH /api/media/:id returns 404 for unknown media", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/media/999",
        headers: auth(),
        body: { alt: "test" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("GET /api/media/file/:id serves file stream", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/media/file/${mediaId}`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(storage.exists).toHaveBeenCalled();
      expect(storage.getStream).toHaveBeenCalled();
    });

    it("GET /api/media/file/:id returns 404 when file missing on storage", async () => {
      vi.mocked(storage.exists).mockResolvedValueOnce(false);
      const res = await app.inject({
        method: "GET",
        url: `/api/media/file/${mediaId}`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(404);
    });

    it("DELETE /api/media/:id deletes media and file", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/media/${mediaId}`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(storage.delete).toHaveBeenCalled();
    });

    it("DELETE /api/media/:id returns 404 for unknown media", async () => {
      const res = await app.inject({ method: "DELETE", url: "/api/media/999", headers: auth() });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("Folder CRUD", () => {
    let folderId: string;

    it("POST /api/media/folders creates a folder", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/media/folders",
        headers: auth(),
        body: { name: "My Folder" },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("My Folder");
      folderId = body.id;
    });

    it("POST /api/media/folders rejects empty name", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/media/folders",
        headers: auth(),
        body: { name: "" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("GET /api/media/folders lists folders", async () => {
      const res = await app.inject({ method: "GET", url: "/api/media/folders", headers: auth() });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/media/folders/:id returns a folder", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/media/folders/${folderId}`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("My Folder");
    });

    it("GET /api/media/folders/:id returns 404 for unknown folder", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/media/folders/999",
        headers: auth(),
      });
      expect(res.statusCode).toBe(404);
    });

    it("PATCH /api/media/folders/:id updates folder name", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/media/folders/${folderId}`,
        headers: auth(),
        body: { name: "Renamed Folder" },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("Renamed Folder");
    });

    it("PATCH /api/media/folders/:id returns 400 for missing fields", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/media/folders/${folderId}`,
        headers: auth(),
        body: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("DELETE /api/media/folders/:id deletes a folder", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/media/folders/${folderId}`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
    });

    it("GET /api/media/folders filter by parentId", async () => {
      const parentRes = await app.inject({
        method: "POST",
        url: "/api/media/folders",
        headers: auth(),
        body: { name: "Parent" },
      });
      const parentId = JSON.parse(parentRes.body).id;

      await app.inject({
        method: "POST",
        url: "/api/media/folders",
        headers: auth(),
        body: { name: "Child", parentId },
      });
      const res = await app.inject({
        method: "GET",
        url: `/api/media/folders?parentId=${parentId}`,
        headers: auth(),
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
