import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { StorageAdapter } from "@arche-cms/storage";

const MEDIA_TABLE = "__cms_media";
const FOLDERS_TABLE = "__cms_media_folders";

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
    filename: "TEXT NOT NULL UNIQUE",
    originalName: "TEXT NOT NULL",
    mimeType: "TEXT NOT NULL",
    size: "INTEGER NOT NULL",
    alt: "TEXT NOT NULL DEFAULT ''",
    folderId: "INTEGER DEFAULT NULL",
    createdAt: "TEXT NOT NULL",
    updatedAt: "TEXT NOT NULL",
  });
  await adapter.createTable(FOLDERS_TABLE, {
    name: "TEXT NOT NULL",
    parentId: "INTEGER DEFAULT NULL",
    createdAt: "TEXT NOT NULL",
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
        summary: "List media",
        description: "Returns a paginated list of media files, optionally filtered by folder",
        tags: ["Media"],
        querystring: {
          type: "object",
          properties: {
            folderId: { type: "string", description: "Filter by folder ID (or 'null' for root)" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const query = request.query as Record<string, string>;
      if (query.folderId) {
        const id = Number(query.folderId);
        const results = await adapter.findMany(MEDIA_TABLE, {
          where: { folderId: id },
          sort: { createdAt: "desc" as const },
        });
        return reply.send({ data: results.data, total: results.total });
      }
      if (query.folderId === "" || query.folderId === "null") {
        const rows = await adapter.raw(
          `SELECT * FROM "${MEDIA_TABLE}" WHERE "folderId" IS NULL ORDER BY "createdAt" DESC`,
        );
        const data = rows as Record<string, unknown>[];
        return reply.send({ data, total: data.length });
      }
      const results = await adapter.findMany(MEDIA_TABLE, { sort: { createdAt: "desc" as const } });
      return reply.send({ data: results.data, total: results.total });
    },
  );

  fastify.get(
    "/api/media/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Get media",
        description: "Returns a single media record by ID",
        tags: ["Media"],
        params: {
          type: "object",
          properties: { id: { type: "string", description: "Media ID" } },
        },
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
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Upload media",
        description: "Upload a new media file (base64-encoded data)",
        tags: ["Media"],
        body: {
          type: "object",
          required: ["fileName", "mimeType", "data"],
          properties: {
            fileName: { type: "string" },
            mimeType: { type: "string" },
            data: { type: "string", description: "Base64-encoded file content" },
            alt: { type: "string" },
            folderId: { type: "string", nullable: true },
          },
        },
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

      const buffer = Buffer.from(body.data, "base64");
      if (buffer.length === 0) {
        return reply.status(400).send({ error: "Invalid base64 data" });
      }

      const ext = body.fileName.includes(".") ? body.fileName.split(".").pop() : "";
      const uniqueName = `${randomUUID()}${ext ? `.${ext}` : ""}`;
      const filePath = `media/${uniqueName}`;

      await storage.save(filePath, buffer, body.mimeType);

      const now = new Date().toISOString();
      const record = await adapter.create(MEDIA_TABLE, {
        filename: filePath,
        originalName: body.fileName,
        mimeType: body.mimeType,
        size: buffer.length,
        alt: body.alt ?? "",
        folderId: body.folderId != null ? Number(body.folderId) : null,
        createdAt: now,
        updatedAt: now,
      });

      return reply.status(201).send(record);
    },
  );

  fastify.patch(
    "/api/media/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Update media",
        description: "Update a media file's metadata (name, alt, folder)",
        tags: ["Media"],
        params: {
          type: "object",
          properties: { id: { type: "string", description: "Media ID" } },
        },
        body: {
          type: "object",
          properties: {
            originalName: { type: "string" },
            alt: { type: "string" },
            folderId: { type: "string", nullable: true },
          },
        },
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
        updates.folderId = body.folderId !== null ? Number(body.folderId) : null;
      }
      updates.updatedAt = new Date().toISOString();

      const updated = await adapter.update(MEDIA_TABLE, id, updates);
      return reply.send(updated);
    },
  );

  fastify.delete(
    "/api/media/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Delete media",
        description: "Delete a media file and its database record",
        tags: ["Media"],
        params: {
          type: "object",
          properties: { id: { type: "string", description: "Media ID" } },
        },
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

      return reply.send({ message: "Media deleted" });
    },
  );

  fastify.get(
    "/api/media/file/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Download media file",
        description: "Returns the raw file stream for a media record",
        tags: ["Media"],
        params: {
          type: "object",
          properties: { id: { type: "string", description: "Media ID" } },
        },
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
        summary: "List folders",
        description: "Returns media folders, optionally filtered by parentId",
        tags: ["Media"],
        querystring: {
          type: "object",
          properties: {
            parentId: { type: "string", description: "Filter by parent folder ID" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const query = request.query as Record<string, string>;
      if (query.parentId) {
        const rows = await adapter.raw(
          `SELECT id, name, parentId, createdAt FROM ${FOLDERS_TABLE} WHERE parentId = ? ORDER BY name ASC`,
          [Number(query.parentId)],
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
        summary: "Get folder",
        description: "Returns a single media folder by ID",
        tags: ["Media"],
        params: {
          type: "object",
          properties: { id: { type: "string", description: "Folder ID" } },
        },
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
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Create folder",
        description: "Create a new media folder",
        tags: ["Media"],
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            parentId: { type: "number", nullable: true },
          },
        },
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
        [body.name.trim(), body.parentId != null ? Number(body.parentId) : null, now],
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
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Update folder",
        description: "Update a media folder's name or parent",
        tags: ["Media"],
        params: {
          type: "object",
          properties: { id: { type: "string", description: "Folder ID" } },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            parentId: { type: "number", nullable: true },
          },
        },
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
        params.push(body.parentId != null ? Number(body.parentId) : null);
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
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Delete folder",
        description: "Delete a media folder (moves child media and folders to root)",
        tags: ["Media"],
        params: {
          type: "object",
          properties: { id: { type: "string", description: "Folder ID" } },
        },
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
