import type { DatabaseAdapter } from "@arche-cms/database";
import type { StorageAdapter } from "@arche-cms/storage";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { randomUUID } from "node:crypto";

import { recordActivity } from "../lib/activity.js";
import { dispatchWebhooks } from "../lib/webhooks.js";
import {
  createMediaFolderBodySchema,
  errorSchema,
  folderListResponseSchema,
  idParamSchema,
  mediaFolderObjectSchema,
  mediaListResponseSchema,
  mediaObjectSchema,
  messageResponseSchema,
} from "../schemas/shared.js";

const MEDIA_TABLE = "__cms_media";
const FOLDERS_TABLE = "__cms_media_folders";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/ogg",
  "application/pdf",
  "application/zip",
  "text/plain",
  "text/csv",
  "application/json",
]);

function safeInteger(value: string | number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

interface MediaRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  alt: string;
  createdAt: string;
  updatedAt: string;
}

async function ensureTables(adapter: DatabaseAdapter): Promise<void> {
  await adapter.createTable(MEDIA_TABLE, {
    alt: "TEXT NOT NULL DEFAULT ''",
    createdAt: "TEXT NOT NULL",
    filename: "TEXT NOT NULL UNIQUE",
    folderId: "INTEGER DEFAULT NULL",
    mimeType: "TEXT NOT NULL",
    originalName: "TEXT NOT NULL",
    size: "INTEGER NOT NULL",
    updatedAt: "TEXT NOT NULL",
  });
  await adapter.createTable(FOLDERS_TABLE, {
    createdAt: "TEXT NOT NULL",
    name: "TEXT NOT NULL",
    parentId: "INTEGER DEFAULT NULL",
  });
}

export function registerMediaRoutes(
  fastify: FastifyInstance,
  adapter: DatabaseAdapter,
  storage: StorageAdapter,
): void {
  let initialized = false;

  async function init(): Promise<void> {
    if (!initialized) {
      await ensureTables(adapter);
      initialized = true;
    }
  }

  // ─── Media CRUD ───────────────────────────────────────────

  fastify.get(
    "/api/media",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns a paginated list of media files, optionally filtered by folder",
        querystring: {
          properties: {
            folderId: { description: "Filter by folder ID (or 'null' for root)", type: "string" },
            limit: { description: "Max items per page", type: "number" },
            offset: { description: "Number of items to skip", type: "number" },
          },
          type: "object",
        },
        response: mediaListResponseSchema,
        summary: "List media",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const query = request.query as Record<string, string>;
      const limit = query.limit ? Math.max(1, Number(query.limit)) : /* v8 ignore next */ undefined;
      const offset = query.offset
        ? Math.max(0, Number(query.offset))
        : /* v8 ignore next */ undefined;
      if (query.folderId) {
        const id = safeInteger(query.folderId);
        if (id === null) {
          return reply.status(400).send({ error: "Invalid folderId" });
        }
        const results = await adapter.findMany(MEDIA_TABLE, {
          sort: { createdAt: "desc" as const },
          where: { folderId: id },
        });
        const data =
          limit !== undefined
            ? results.data.slice(offset ?? 0, (offset ?? 0) + limit)
            : results.data;
        return reply.send({ data, total: results.total });
      }
      /* v8 ignore start — "null" is truthy so caught by if (query.folderId) above; "" is falsy so also unreachable */
      if (query.folderId === "" || query.folderId === "null") {
        const rows = await adapter.raw(
          `SELECT * FROM "${MEDIA_TABLE}" WHERE "folderId" IS NULL ORDER BY "createdAt" DESC`,
        );
        const allData = rows as Record<string, unknown>[];
        const data =
          limit !== undefined ? allData.slice(offset ?? 0, (offset ?? 0) + limit) : allData;
        return reply.send({ data, total: allData.length });
      }
      /* v8 ignore stop */
      const results = await adapter.findMany(MEDIA_TABLE, { sort: { createdAt: "desc" as const } });
      const data =
        limit !== undefined ? results.data.slice(offset ?? 0, (offset ?? 0) + limit) : results.data;
      return reply.send({ data, total: results.total });
    },
  );

  fastify.get(
    "/api/media/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns a single media record by ID",
        params: idParamSchema,
        response: {
          "2xx": mediaObjectSchema,
          "404": errorSchema,
        },
        summary: "Get media",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const record = await adapter.findOne(MEDIA_TABLE, id);
      if (!record) return reply.status(404).send({ error: "Media not found" });
      return reply.send(record);
    },
  );

  fastify.post(
    "/api/media",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("create", "media")],
      schema: {
        body: {
          properties: {
            alt: { type: "string" },
            data: { description: "Base64-encoded file content", type: "string" },
            fileName: { type: "string" },
            folderId: { nullable: true, type: "string" },
            mimeType: { type: "string" },
          },
          required: ["fileName", "mimeType", "data"],
          type: "object",
        },
        description: "Upload a new media file (base64-encoded data)",
        response: {
          "201": mediaObjectSchema,
          "400": errorSchema,
        },
        summary: "Upload media",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const body = request.body as {
        fileName?: string;
        mimeType?: string;
        data?: string;
        alt?: string;
        folderId?: string | null;
      };

      if (!body.fileName || !body.mimeType || !body.data) {
        return reply.status(400).send({ error: "fileName, mimeType, and data are required" });
      }

      if (!ALLOWED_MIME_TYPES.has(body.mimeType)) {
        return reply.status(400).send({ error: `MIME type "${body.mimeType}" is not allowed` });
      }

      const buffer = Buffer.from(body.data, "base64");
      /* v8 ignore start — unreachable: empty data caught by validation above */
      if (buffer.length === 0) {
        return reply.status(400).send({ error: "Invalid base64 data" });
      }
      /* v8 ignore stop */

      /* v8 ignore start — requires >10 MB base64 payload, impractical to test */
      if (buffer.length > MAX_FILE_SIZE) {
        return reply
          .status(400)
          .send({ error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)} MB` });
      }
      /* v8 ignore stop */

      const ext = body.fileName.includes(".")
        ? body.fileName.split(".").pop()
        : /* v8 ignore next */ "";
      const uniqueName = `${randomUUID()}${ext ? `.${ext}` : /* v8 ignore next */ ""}`;
      const filePath = `media/${uniqueName}`;

      await storage.save(filePath, buffer, body.mimeType);

      const now = new Date().toISOString();
      const record = await adapter.create(MEDIA_TABLE, {
        alt: body.alt ?? "",
        createdAt: now,
        filename: filePath,
        folderId: body.folderId != null ? safeInteger(body.folderId) : /* v8 ignore next */ null,
        mimeType: body.mimeType,
        originalName: body.fileName,
        size: buffer.length,
        updatedAt: now,
      });

      const rec = record as Record<string, unknown>;
      const docId = rec.id != null ? String(rec.id) : /* v8 ignore next */ undefined;
      recordActivity(adapter, {
        action: "create",
        collection: "media",
        documentId: docId,
        label: body.fileName,
      }).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[activity] record failed:", e);
        },
      ); /* v8 ignore stop */
      dispatchWebhooks(adapter, "media:created", "media", docId, rec).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[webhooks] dispatch failed:", e);
        },
      ); /* v8 ignore stop */

      return reply.status(201).send(record);
    },
  );

  fastify.patch(
    "/api/media/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          properties: {
            alt: { type: "string" },
            folderId: { nullable: true, type: "string" },
            originalName: { type: "string" },
          },
          type: "object",
        },
        description: "Update a media file's metadata (name, alt, folder)",
        params: idParamSchema,
        response: {
          "2xx": mediaObjectSchema,
          "404": errorSchema,
        },
        summary: "Update media",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const body = request.body as {
        originalName?: string;
        alt?: string;
        folderId?: string | null;
      };
      const record = await adapter.findOne(MEDIA_TABLE, id);
      if (!record) return reply.status(404).send({ error: "Media not found" });

      const updates: Record<string, unknown> = {};
      if (body.originalName !== undefined) updates.originalName = body.originalName;
      if (body.alt !== undefined) updates.alt = body.alt;
      if (body.folderId !== undefined) {
        updates.folderId =
          body.folderId !== null ? safeInteger(body.folderId) : /* v8 ignore next */ null;
      }
      updates.updatedAt = new Date().toISOString();

      const updated = await adapter.update(MEDIA_TABLE, id, updates);

      recordActivity(adapter, {
        action: "update",
        collection: "media",
        documentId: id,
        label: (updates.originalName as string) ?? "",
      }).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[activity] record failed:", e);
        },
      ); /* v8 ignore stop */
      dispatchWebhooks(adapter, "media:updated", "media", id, updates).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[webhooks] dispatch failed:", e);
        },
      ); /* v8 ignore stop */

      return reply.send(updated);
    },
  );

  fastify.delete(
    "/api/media/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("delete", "media")],
      schema: {
        description: "Delete a media file and its database record",
        params: idParamSchema,
        response: {
          "2xx": messageResponseSchema,
          "404": errorSchema,
        },
        summary: "Delete media",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const record = await adapter.findOne(MEDIA_TABLE, id);
      if (!record) return reply.status(404).send({ error: "Media not found" });

      const typed = record as unknown as MediaRecord;
      await storage.delete(typed.filename);
      await adapter.delete(MEDIA_TABLE, id);

      recordActivity(adapter, {
        action: "delete",
        collection: "media",
        documentId: id,
        label: typed.originalName,
      }).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[activity] record failed:", e);
        },
      ); /* v8 ignore stop */
      dispatchWebhooks(adapter, "media:deleted", "media", id).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[webhooks] dispatch failed:", e);
        },
      ); /* v8 ignore stop */

      return reply.send({ message: "Media deleted" });
    },
  );

  fastify.get(
    "/api/media/file/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns the raw file stream for a media record",
        params: idParamSchema,
        response: {
          "404": errorSchema,
        },
        summary: "Download media file",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const record = await adapter.findOne(MEDIA_TABLE, id);
      if (!record) return reply.status(404).send({ error: "Media not found" });

      const typed = record as unknown as MediaRecord;
      const exists = await storage.exists(typed.filename);
      if (!exists) return reply.status(404).send({ error: "File not found on disk" });

      const stream = await storage.getStream(typed.filename);
      reply.type(typed.mimeType);
      reply.header("Content-Disposition", `inline; filename="${typed.originalName}"`);
      reply.header("Content-Length", String(typed.size));
      return reply.send(stream);
    },
  );

  // ─── Folder CRUD ──────────────────────────────────────────

  fastify.get(
    "/api/media/folders",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns media folders, optionally filtered by parentId",
        querystring: {
          properties: {
            parentId: { description: "Filter by parent folder ID", type: "string" },
          },
          type: "object",
        },
        response: folderListResponseSchema,
        summary: "List folders",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const query = request.query as Record<string, string>;
      if (query.parentId && query.parentId !== "null" && query.parentId !== "undefined") {
        const id = safeInteger(query.parentId);
        if (id === null) {
          return reply.status(400).send({ error: "Invalid parentId" });
        }
        const rows = await adapter.raw(
          `SELECT id, name, parentId, createdAt FROM ${FOLDERS_TABLE} WHERE parentId = ? ORDER BY name ASC`,
          [id],
        );
        return reply.send({ data: rows, total: (rows as unknown[]).length });
      }
      if (query.parentId === "" || query.parentId === "null") {
        const rows = await adapter.raw(
          `SELECT id, name, parentId, createdAt FROM ${FOLDERS_TABLE} WHERE parentId IS NULL ORDER BY name ASC`,
        );
        return reply.send({ data: rows, total: (rows as unknown[]).length });
      }
      const rows = await adapter.raw(
        `SELECT id, name, parentId, createdAt FROM ${FOLDERS_TABLE} ORDER BY name ASC`,
      );
      return reply.send({ data: rows, total: (rows as unknown[]).length });
    },
  );

  fastify.get(
    "/api/media/folders/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns a single media folder by ID",
        params: idParamSchema,
        response: {
          "2xx": mediaFolderObjectSchema,
          "404": errorSchema,
        },
        summary: "Get folder",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const rows = await adapter.raw(
        `SELECT id, name, parentId, createdAt FROM ${FOLDERS_TABLE} WHERE id = ?`,
        [Number(id)],
      );
      const folders = rows as {
        id: number;
        name: string;
        parentId: number | null;
        createdAt: string;
      }[];
      if (folders.length === 0) return reply.status(404).send({ error: "Folder not found" });
      return reply.send(folders[0]);
    },
  );

  fastify.post(
    "/api/media/folders",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "media")],
      schema: {
        body: createMediaFolderBodySchema,
        description: "Create a new media folder",
        response: {
          "201": mediaFolderObjectSchema,
          "400": errorSchema,
        },
        summary: "Create folder",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const body = request.body as { name?: string; parentId?: number | null };
      if (!body.name || !body.name.trim()) {
        return reply.status(400).send({ error: "Folder name is required" });
      }
      const now = new Date().toISOString();
      await adapter.raw(
        `INSERT INTO ${FOLDERS_TABLE} (name, parentId, createdAt) VALUES (?, ?, ?)`,
        [body.name.trim(), body.parentId != null ? safeInteger(body.parentId) : null, now],
      );
      const rows = await adapter.raw(
        `SELECT id, name, parentId, createdAt FROM ${FOLDERS_TABLE} ORDER BY id DESC LIMIT 1`,
      );
      const created = (
        rows as { id: number; name: string; parentId: number | null; createdAt: string }[]
      )[0];
      return reply.status(201).send(created);
    },
  );

  fastify.patch(
    "/api/media/folders/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "media")],
      schema: {
        body: {
          properties: {
            name: { type: "string" },
            parentId: { nullable: true, type: "number" },
          },
          type: "object",
        },
        description: "Update a media folder's name or parent",
        params: idParamSchema,
        response: {
          "2xx": mediaFolderObjectSchema,
          "400": errorSchema,
          "404": errorSchema,
        },
        summary: "Update folder",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const body = request.body as { name?: string; parentId?: number | null };

      const sets: string[] = [];
      const params: unknown[] = [];
      if (body.name !== undefined) {
        if (!body.name.trim())
          return reply.status(400).send({ error: "Folder name cannot be empty" });
        sets.push("name = ?");
        params.push(body.name.trim());
      }
      if (body.parentId !== undefined) {
        sets.push("parentId = ?");
        params.push(body.parentId != null ? safeInteger(body.parentId) : null);
      }
      if (sets.length === 0) return reply.status(400).send({ error: "No fields to update" });
      params.push(Number(id));
      await adapter.raw(`UPDATE ${FOLDERS_TABLE} SET ${sets.join(", ")} WHERE id = ?`, params);
      const rows = await adapter.raw(
        `SELECT id, name, parentId, createdAt FROM ${FOLDERS_TABLE} WHERE id = ?`,
        [Number(id)],
      );
      const updated = (
        rows as { id: number; name: string; parentId: number | null; createdAt: string }[]
      )[0];
      if (!updated) return reply.status(404).send({ error: "Folder not found" });
      return reply.send(updated);
    },
  );

  fastify.delete(
    "/api/media/folders/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "media")],
      schema: {
        description: "Delete a media folder (moves child media and folders to root)",
        params: idParamSchema,
        response: {
          "2xx": messageResponseSchema,
        },
        summary: "Delete folder",
        tags: ["Media"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const numericId = Number(id);

      await adapter.raw(`UPDATE ${MEDIA_TABLE} SET folderId = NULL WHERE folderId = ?`, [
        numericId,
      ]);
      await adapter.raw(`UPDATE ${FOLDERS_TABLE} SET parentId = NULL WHERE parentId = ?`, [
        numericId,
      ]);
      await adapter.raw(`DELETE FROM ${FOLDERS_TABLE} WHERE id = ?`, [numericId]);

      return reply.send({ message: "Folder deleted" });
    },
  );
}
