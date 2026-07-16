import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";

const TOKENS_TABLE = "__cms_api_tokens";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRawToken(): string {
  return `cms_${randomBytes(32).toString("hex")}`;
}

export async function ensureApiTokensTable(adapter: DatabaseAdapter): Promise<void> {
  await adapter.createTable(TOKENS_TABLE, {
    name: "TEXT NOT NULL",
    token_hash: "TEXT NOT NULL UNIQUE",
    last_four: "TEXT NOT NULL",
    description: "TEXT NOT NULL DEFAULT ''",
    created_at: "TEXT NOT NULL",
    created_by: "TEXT NOT NULL",
    last_used_at: "TEXT",
  });
}

export async function verifyApiToken(
  adapter: DatabaseAdapter,
  token: string,
): Promise<{ user: { sub: string; email: string; role: string } } | null> {
  const tokenHash = hashToken(token);
  const rows = (await adapter.raw(`SELECT rowid, name FROM ${TOKENS_TABLE} WHERE token_hash = ?`, [
    tokenHash,
  ])) as { rowid: string; name: string }[];
  if (!rows || rows.length === 0) return null;

  const entry = rows[0];
  if (!entry) return null;

  await adapter.raw(`UPDATE ${TOKENS_TABLE} SET last_used_at = ? WHERE rowid = ?`, [
    new Date().toISOString(),
    entry.rowid,
  ]);

  return {
    user: {
      sub: String(entry.rowid),
      email: entry.name,
      role: "admin",
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
      preHandler: [fastify.authenticate],
      schema: {
        summary: "List API tokens",
        description: "Returns all API tokens (without the raw token values)",
        tags: ["Settings"],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const rows = (await adapter.raw(
        `SELECT rowid, name, last_four, description, created_at, created_by, last_used_at FROM ${TOKENS_TABLE} ORDER BY created_at DESC`,
      )) as {
        rowid: number;
        name: string;
        last_four: string;
        description: string;
        created_at: string;
        created_by: string;
        last_used_at: string | null;
      }[];

      const data = rows.map((r) => ({
        id: String(r.rowid),
        name: r.name,
        lastFour: r.last_four,
        description: r.description,
        createdAt: r.created_at,
        createdBy: r.created_by,
        lastUsedAt: r.last_used_at,
      }));

      return reply.send({ data, total: data.length });
    },
  );

  fastify.post(
    "/api/settings/api-tokens",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Create API token",
        description: "Create a new API token. The raw token is returned only once in the response.",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const body = request.body as { name?: string; description?: string };

      if (!body.name || !body.name.trim()) {
        return reply.status(400).send({ error: "Token name is required" });
      }

      const rawToken = generateRawToken();
      const tokenHash = hashToken(rawToken);
      const lastFour = rawToken.slice(-4);
      const now = new Date().toISOString();
      const createdBy = request.user?.email ?? "unknown";

      await adapter.raw(
        `INSERT INTO ${TOKENS_TABLE} (name, token_hash, last_four, description, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
        [body.name.trim(), tokenHash, lastFour, body.description?.trim() ?? "", now, createdBy],
      );

      const rows = (await adapter.raw(
        `SELECT rowid, name, last_four, description, created_at, created_by FROM ${TOKENS_TABLE} WHERE token_hash = ?`,
        [tokenHash],
      )) as {
        rowid: number;
        name: string;
        last_four: string;
        description: string;
        created_at: string;
        created_by: string;
      }[];

      const entry = rows[0];
      if (!entry) {
        return reply.status(500).send({ error: "Failed to retrieve created token" });
      }

      return reply.status(201).send({
        token: {
          id: String(entry.rowid),
          name: entry.name,
          lastFour: entry.last_four,
          description: entry.description,
          createdAt: entry.created_at,
          createdBy: entry.created_by,
        },
        rawToken,
      });
    },
  );

  fastify.delete(
    "/api/settings/api-tokens/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "settings")],
      schema: {
        summary: "Revoke API token",
        description: "Revoke (delete) an API token by ID (requires manage:settings permission)",
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
