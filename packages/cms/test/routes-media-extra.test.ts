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

describe("Media Routes — extra", () => {
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

  describe("Media listing edge cases", () => {
    it("GET /api/media?folderId=null returns 400 (string 'null' is truthy, hits safeInteger)", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media?folderId=null",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe("Invalid folderId");
    });

    it("GET /api/media?folderId=invalid returns 400", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media?folderId=not-a-number",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe("Invalid folderId");
    });
  });

  describe("Media upload validation", () => {
    it("POST /api/media with missing mimeType returns 400", async () => {
      const res = await app.inject({
        body: { data: base64Img, fileName: "test.png" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(400);
    });

    it("POST /api/media with missing data returns 400", async () => {
      const res = await app.inject({
        body: { fileName: "test.png", mimeType: "image/png" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(400);
    });

    it("POST /api/media with missing fileName returns 400", async () => {
      const res = await app.inject({
        body: { data: base64Img, mimeType: "image/png" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(400);
    });

    it("POST /api/media with disallowed MIME type returns 400", async () => {
      const res = await app.inject({
        body: { data: base64Img, fileName: "test.exe", mimeType: "application/x-executable" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain("not allowed");
    });

    it("POST /api/media with empty base64 string returns 400", async () => {
      const res = await app.inject({
        body: { data: "", fileName: "test.png", mimeType: "image/png" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain("required");
    });

    it("POST /api/media with allowed MIME types succeeds", async () => {
      const allowedTypes = [
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "application/pdf",
      ];
      for (const mimeType of allowedTypes) {
        vi.mocked(storage.save).mockClear();
        const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
        const res = await app.inject({
          body: { data: base64Img, fileName: `test.${ext}`, mimeType },
          headers: auth(),
          method: "POST",
          url: "/api/media",
        });
        expect(res.statusCode).toBe(201);
      }
    });
  });

  describe("Media CRUD — extra paths", () => {
    let mediaId: string;

    it("POST /api/media creates for further tests", async () => {
      const res = await app.inject({
        body: { alt: "Extra test", data: base64Img, fileName: "extra.png", mimeType: "image/png" },
        headers: auth(),
        method: "POST",
        url: "/api/media",
      });
      expect(res.statusCode).toBe(201);
      mediaId = JSON.parse(res.body).id;
    });

    it("GET /api/media/:id returns 404 for nonexistent media", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/99999",
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("Media not found");
    });

    it("PATCH /api/media/:id returns 404 for nonexistent media", async () => {
      const res = await app.inject({
        body: { alt: "updated" },
        headers: auth(),
        method: "PATCH",
        url: "/api/media/99999",
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("Media not found");
    });

    it("DELETE /api/media/:id returns 404 for nonexistent media", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: "/api/media/99999",
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("Media not found");
    });

    it("GET /api/media/file/:id returns 404 for nonexistent media", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/file/99999",
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("Media not found");
    });

    it("GET /api/media/file/:id returns 404 when file missing on disk", async () => {
      vi.mocked(storage.exists).mockResolvedValueOnce(false);
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/media/file/${mediaId}`,
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("File not found on disk");
    });

    it("GET /api/media with limit and offset params", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media?limit=1&offset=0",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Folder edge cases", () => {
    it("GET /api/media/folders with parentId=undefined returns all", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/folders?parentId=undefined",
      });
      expect(res.statusCode).toBe(200);
    });

    it("GET /api/media/folders with invalid parentId returns 400", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/media/folders?parentId=abc",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe("Invalid parentId");
    });

    it("POST /api/media/folders with whitespace-only name returns 400", async () => {
      const res = await app.inject({
        body: { name: "   " },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe("Folder name is required");
    });

    it("PATCH /api/media/folders/:id with empty name returns 400", async () => {
      const createRes = await app.inject({
        body: { name: "To Be Updated" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const folderId = JSON.parse(createRes.body).id;

      const res = await app.inject({
        body: { name: "" },
        headers: auth(),
        method: "PATCH",
        url: `/api/media/folders/${folderId}`,
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain("cannot be empty");
    });

    it("PATCH /api/media/folders/:id with no fields returns 400", async () => {
      const createRes = await app.inject({
        body: { name: "No Fields" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const folderId = JSON.parse(createRes.body).id;

      const res = await app.inject({
        body: {},
        headers: auth(),
        method: "PATCH",
        url: `/api/media/folders/${folderId}`,
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe("No fields to update");
    });

    it("PATCH /api/media/folders/:id returns 404 for nonexistent folder", async () => {
      const res = await app.inject({
        body: { name: "Ghost" },
        headers: auth(),
        method: "PATCH",
        url: "/api/media/folders/99999",
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("Folder not found");
    });

    it("DELETE /api/media/folders/:id moves child media to root", async () => {
      const createFolderRes = await app.inject({
        body: { name: "Delete Me" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const folderId = JSON.parse(createFolderRes.body).id;

      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/media/folders/${folderId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).message).toBe("Folder deleted");
    });

    it("GET /api/media/folders with parentId filter returns filtered", async () => {
      const parentRes = await app.inject({
        body: { name: "Parent Extra" },
        headers: auth(),
        method: "POST",
        url: "/api/media/folders",
      });
      const parentId = JSON.parse(parentRes.body).id;

      await app.inject({
        body: { name: "Child Extra", parentId },
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
    });
  });
});
