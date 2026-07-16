import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import { ensureWebhooksTable } from "../lib/webhooks.js";

const WEBHOOKS_TABLE = "__cms_webhooks";

function mapRow(row: {
  rowid: number;
  name: string;
  url: string;
  events: string;
  collection: string;
  enabled: number;
  secret?: string;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: String(row.rowid),
    name: row.name,
    url: row.url,
    events: JSON.parse(row.events ?? "[]") as string[],
    collection: row.collection,
    enabled: row.enabled === 1,
    hasSecret: Boolean(row.secret),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function registerWebhookRoutes(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  let initialized = false;

  async function init(): Promise<void> {
    if (!initialized) {
      await ensureWebhooksTable(adapter);
      initialized = true;
    }
  }

  fastify.get(
    "/api/settings/webhooks",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "List webhooks",
        description: "Returns all configured webhooks",
        tags: ["Settings"],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const rows = (await adapter.raw(
        `SELECT rowid, name, url, events, collection, enabled, created_at, updated_at FROM ${WEBHOOKS_TABLE} ORDER BY created_at DESC`,
      )) as {
        rowid: number;
        name: string;
        url: string;
        events: string;
        collection: string;
        enabled: number;
        created_at: string;
        updated_at: string;
      }[];

      const data = rows.map(mapRow);
      return reply.send({ data, total: data.length });
    },
  );

  fastify.get(
    "/api/settings/webhooks/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Get webhook",
        description: "Returns a single webhook configuration by ID",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const rows = (await adapter.raw(
        `SELECT rowid, name, url, events, collection, enabled, secret, created_at, updated_at FROM ${WEBHOOKS_TABLE} WHERE rowid = ?`,
        [Number(id)],
      )) as {
        rowid: number;
        name: string;
        url: string;
        events: string;
        collection: string;
        enabled: number;
        secret: string;
        created_at: string;
        updated_at: string;
      }[];

      if (!rows || rows.length === 0) {
        return reply.status(404).send({ error: "Webhook not found" });
      }

      const entry = rows[0];
      if (!entry) {
        return reply.status(404).send({ error: "Webhook not found" });
      }

      return reply.send(mapRow(entry));
    },
  );

  fastify.post(
    "/api/settings/webhooks",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "settings")],
      schema: {
        summary: "Create webhook",
        description: "Create a new webhook configuration (requires manage:settings permission)",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const body = request.body as {
        name?: string;
        url?: string;
        events?: string[];
        collection?: string;
        secret?: string;
      };

      if (!body.name || !body.name.trim()) {
        return reply.status(400).send({ error: "Webhook name is required" });
      }
      if (!body.url || !body.url.trim()) {
        return reply.status(400).send({ error: "URL is required" });
      }
      if (!body.events || body.events.length === 0) {
        return reply.status(400).send({ error: "At least one event is required" });
      }

      const now = new Date().toISOString();
      await adapter.raw(
        `INSERT INTO ${WEBHOOKS_TABLE} (name, url, events, collection, enabled, secret, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          body.name.trim(),
          body.url.trim(),
          JSON.stringify(body.events),
          body.collection?.trim() || "*",
          body.secret?.trim() ?? "",
          now,
          now,
        ],
      );

      const rows = (await adapter.raw(
        `SELECT rowid, name, url, events, collection, enabled, created_at, updated_at FROM ${WEBHOOKS_TABLE} ORDER BY rowid DESC LIMIT 1`,
      )) as {
        rowid: number;
        name: string;
        url: string;
        events: string;
        collection: string;
        enabled: number;
        created_at: string;
        updated_at: string;
      }[];

      const created = rows[0];
      if (!created) {
        return reply.status(500).send({ error: "Failed to retrieve created webhook" });
      }

      return reply.status(201).send(mapRow(created));
    },
  );

  fastify.put(
    "/api/settings/webhooks/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "settings")],
      schema: {
        summary: "Update webhook",
        description: "Update a webhook configuration (requires manage:settings permission)",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        url?: string;
        events?: string[];
        collection?: string;
        enabled?: boolean;
        secret?: string;
      };

      const existing = (await adapter.raw(`SELECT rowid FROM ${WEBHOOKS_TABLE} WHERE rowid = ?`, [
        Number(id),
      ])) as { rowid: number }[];

      if (!existing || existing.length === 0) {
        return reply.status(404).send({ error: "Webhook not found" });
      }

      const sets: string[] = [];
      const params: unknown[] = [];

      if (body.name !== undefined) {
        if (!body.name.trim()) return reply.status(400).send({ error: "Name cannot be empty" });
        sets.push("name = ?");
        params.push(body.name.trim());
      }
      if (body.url !== undefined) {
        if (!body.url.trim()) return reply.status(400).send({ error: "URL cannot be empty" });
        sets.push("url = ?");
        params.push(body.url.trim());
      }
      if (body.events !== undefined) {
        if (body.events.length === 0) {
          return reply.status(400).send({ error: "At least one event is required" });
        }
        sets.push("events = ?");
        params.push(JSON.stringify(body.events));
      }
      if (body.collection !== undefined) {
        sets.push("collection = ?");
        params.push(body.collection.trim() || "*");
      }
      if (body.enabled !== undefined) {
        sets.push("enabled = ?");
        params.push(body.enabled ? 1 : 0);
      }
      if (body.secret !== undefined) {
        sets.push("secret = ?");
        params.push(body.secret.trim() ?? "");
      }

      if (sets.length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      sets.push("updated_at = ?");
      params.push(new Date().toISOString());
      params.push(Number(id));

      await adapter.raw(`UPDATE ${WEBHOOKS_TABLE} SET ${sets.join(", ")} WHERE rowid = ?`, params);

      const rows = (await adapter.raw(
        `SELECT rowid, name, url, events, collection, enabled, created_at, updated_at FROM ${WEBHOOKS_TABLE} WHERE rowid = ?`,
        [Number(id)],
      )) as {
        rowid: number;
        name: string;
        url: string;
        events: string;
        collection: string;
        enabled: number;
        created_at: string;
        updated_at: string;
      }[];

      const updated = rows[0];
      if (!updated) {
        return reply.status(500).send({ error: "Failed to retrieve updated webhook" });
      }

      return reply.send(mapRow(updated));
    },
  );

  fastify.delete(
    "/api/settings/webhooks/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "settings")],
      schema: {
        summary: "Delete webhook",
        description: "Delete a webhook configuration (requires manage:settings permission)",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const existing = (await adapter.raw(`SELECT rowid FROM ${WEBHOOKS_TABLE} WHERE rowid = ?`, [
        Number(id),
      ])) as { rowid: number }[];

      if (!existing || existing.length === 0) {
        return reply.status(404).send({ error: "Webhook not found" });
      }

      await adapter.raw(`DELETE FROM ${WEBHOOKS_TABLE} WHERE rowid = ?`, [Number(id)]);
      return reply.send({ message: "Webhook deleted" });
    },
  );
}
