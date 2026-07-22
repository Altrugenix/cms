import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { createHash, randomBytes } from "node:crypto";

import {
  apiTokenListResponseSchema,
  apiTokenObjectSchema,
  createApiTokenBodySchema,
  errorSchema,
  idParamSchema,
  messageResponseSchema,
} from "../schemas/shared.js";

const TOKENS_TABLE = "__cms_api_tokens";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRawToken(): string {
  return `cms_${randomBytes(32).toString("hex")}`;
}

export async function ensureApiTokensTable(adapter: DatabaseAdapter): Promise<void> {
  await adapter.createTable(TOKENS_TABLE, {
    created_at: "TEXT NOT NULL",
    created_by: "TEXT NOT NULL",
    description: "TEXT NOT NULL DEFAULT ''",
    last_four: "TEXT NOT NULL",
    last_used_at: "TEXT",
    name: "TEXT NOT NULL",
    role: "TEXT NOT NULL DEFAULT 'admin'",
    token_hash: "TEXT NOT NULL UNIQUE",
  });
}

export async function verifyApiToken(
  adapter: DatabaseAdapter,
  token: string,
): Promise<{ user: { sub: string; email: string; role: string } } | null> {
  const tokenHash = hashToken(token);
  const rows = (await adapter.raw(
    `SELECT rowid, name, role FROM ${TOKENS_TABLE} WHERE token_hash = ?`,
    [tokenHash],
  )) as { rowid: string; name: string; role: string }[];
  if (!rows || rows.length === 0) return null;

  const entry = rows[0];
  /* v8 ignore next -- defensive guard; query always returns a row after checking length */
  if (!entry) return null;

  await adapter.raw(`UPDATE ${TOKENS_TABLE} SET last_used_at = ? WHERE rowid = ?`, [
    new Date().toISOString(),
    entry.rowid,
  ]);

  return {
    user: {
      email: entry.name,
      role: entry.role || /* v8 ignore next */ "admin",
      sub: String(entry.rowid),
    },
  };
}

export function registerApiTokenRoutes(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  let initialized = false;

  async function init(): Promise<void> {
    if (!initialized) {
      await ensureApiTokensTable(adapter);
      initialized = true;
    }
  }

  fastify.get(
    "/api/settings/api-tokens",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("read", "settings")],
      schema: {
        description: "Returns all API tokens without the raw token values (with pagination)",
        querystring: {
          properties: {
            limit: { description: "Max items per page", type: "number" },
            offset: { description: "Number of items to skip", type: "number" },
          },
          type: "object",
        },
        response: apiTokenListResponseSchema,
        summary: "List API tokens",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Math.max(1, Number(query.limit)) : /* v8 ignore next */ undefined;
      const offset = query.offset
        ? Math.max(0, Number(query.offset))
        : /* v8 ignore next */ undefined;
      const rows = (await adapter.raw(
        `SELECT rowid, name, last_four, description, role, created_at, created_by, last_used_at FROM ${TOKENS_TABLE} ORDER BY created_at DESC`,
      )) as {
        rowid: number;
        name: string;
        last_four: string;
        description: string;
        role: string;
        created_at: string;
        created_by: string;
        last_used_at: string | null;
      }[];

      const total = rows.length;
      const sliced = limit !== undefined ? rows.slice(offset ?? 0, (offset ?? 0) + limit) : rows;
      const data = sliced.map((r) => ({
        createdAt: r.created_at,
        createdBy: r.created_by,
        description: r.description,
        id: String(r.rowid),
        lastFour: r.last_four,
        lastUsedAt: r.last_used_at,
        name: r.name,
        role: r.role,
      }));

      return reply.send({ data, total });
    },
  );

  fastify.post(
    "/api/settings/api-tokens",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("create", "settings")],
      schema: {
        body: createApiTokenBodySchema,
        description: "Create a new API token. The raw token is returned only once in the response.",
        response: {
          "201": {
            properties: {
              rawToken: { description: "The raw token value (shown only once)", type: "string" },
              token: apiTokenObjectSchema,
            },
            required: ["rawToken", "token"],
            type: "object",
          },
          "400": errorSchema,
        },
        summary: "Create API token",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const body = request.body as { name?: string; description?: string; role?: string };

      if (!body.name || !body.name.trim()) {
        return reply.status(400).send({ error: "Token name is required" });
      }

      const role = body.role?.trim() || /* v8 ignore next */ "admin";
      const rawToken = generateRawToken();
      const tokenHash = hashToken(rawToken);
      const lastFour = rawToken.slice(-4);
      const now = new Date().toISOString();
      const createdBy = request.user?.email ?? /* v8 ignore next */ "unknown";

      await adapter.raw(
        `INSERT INTO ${TOKENS_TABLE} (name, token_hash, last_four, description, role, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          body.name.trim(),
          tokenHash,
          lastFour,
          body.description?.trim() ?? "",
          role,
          now,
          createdBy,
        ],
      );

      const rows = (await adapter.raw(
        `SELECT rowid, name, last_four, description, role, created_at, created_by FROM ${TOKENS_TABLE} WHERE token_hash = ?`,
        [tokenHash],
      )) as {
        rowid: number;
        name: string;
        last_four: string;
        description: string;
        role: string;
        created_at: string;
        created_by: string;
      }[];

      const entry = rows[0];
      /* v8 ignore start — defensive: insert always returns the row */
      if (!entry) {
        return reply.status(500).send({ error: "Failed to retrieve created token" });
      }
      /* v8 ignore stop */

      return reply.status(201).send({
        rawToken,
        token: {
          createdAt: entry.created_at,
          createdBy: entry.created_by,
          description: entry.description,
          id: String(entry.rowid),
          lastFour: entry.last_four,
          name: entry.name,
          role: entry.role,
        },
      });
    },
  );

  fastify.delete(
    "/api/settings/api-tokens/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "settings")],
      schema: {
        description: "Revoke (delete) an API token by ID (requires manage:settings permission)",
        params: idParamSchema,
        response: {
          "2xx": messageResponseSchema,
          "404": errorSchema,
        },
        summary: "Revoke API token",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };

      const rows = (await adapter.raw(`SELECT rowid FROM ${TOKENS_TABLE} WHERE rowid = ?`, [
        Number(id),
      ])) as { rowid: number }[];

      if (!rows || rows.length === 0) {
        return reply.status(404).send({ error: "Token not found" });
      }

      await adapter.raw(`DELETE FROM ${TOKENS_TABLE} WHERE rowid = ?`, [Number(id)]);
      return reply.send({ message: "Token revoked" });
    },
  );
}
