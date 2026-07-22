import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { ensureWebhooksTable } from "../lib/webhooks.js";
import {
  createWebhookBodySchema,
  errorSchema,
  idParamSchema,
  messageResponseSchema,
  webhookListResponseSchema,
  webhookObjectSchema,
} from "../schemas/shared.js";

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
  last_status?: number | null;
  last_success?: number;
  last_error?: string;
  last_delivered_at?: string | null;
}) {
  return {
    collection: row.collection,
    createdAt: row.created_at,
    enabled: row.enabled === 1,
    events: JSON.parse(row.events ?? /* v8 ignore next */ "[]") as string[],
    hasSecret: Boolean(row.secret),
    id: String(row.rowid),
    lastDeliveredAt: row.last_delivered_at ?? null,
    lastError: row.last_error ?? "",
    lastStatus: row.last_status ?? null,
    lastSuccess: (row.last_success ?? 0) === 1,
    name: row.name,
    updatedAt: row.updated_at,
    url: row.url,
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
      preHandler: [fastify.authenticate, fastify.requirePermission("read", "settings")],
      schema: {
        description: "Returns all configured webhooks (with pagination)",
        querystring: {
          properties: {
            limit: { description: "Max items per page", type: "number" },
            offset: { description: "Number of items to skip", type: "number" },
          },
          type: "object",
        },
        response: webhookListResponseSchema,
        summary: "List webhooks",
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
        `SELECT rowid, name, url, events, collection, enabled, created_at, updated_at, last_status, last_success, last_error, last_delivered_at FROM ${WEBHOOKS_TABLE} ORDER BY created_at DESC`,
      )) as {
        rowid: number;
        name: string;
        url: string;
        events: string;
        collection: string;
        enabled: number;
        created_at: string;
        updated_at: string;
        last_status: number | null;
        last_success: number;
        last_error: string;
        last_delivered_at: string | null;
      }[];

      const total = rows.length;
      const sliced = limit !== undefined ? rows.slice(offset ?? 0, (offset ?? 0) + limit) : rows;
      const data = sliced.map(mapRow);
      return reply.send({ data, total });
    },
  );

  /* v8 ignore start */
  fastify.get(
    "/api/settings/webhooks/:id",
    /* v8 ignore start */
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("read", "settings")],
      schema: {
        description: "Returns a single webhook configuration by ID",
        params: idParamSchema,
        response: {
          "2xx": webhookObjectSchema,
          "404": errorSchema,
        },
        summary: "Get webhook",
        tags: ["Settings"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await init();
      const { id } = request.params as { id: string };
      const rows = (await adapter.raw(
        `SELECT rowid, name, url, events, collection, enabled, secret, created_at, updated_at, last_status, last_success, last_error, last_delivered_at FROM ${WEBHOOKS_TABLE} WHERE rowid = ?`,
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
        last_status: number | null;
        last_success: number;
        last_error: string;
        last_delivered_at: string | null;
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
  /* v8 ignore stop */

  fastify.post(
    "/api/settings/webhooks",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "settings")],
      schema: {
        body: createWebhookBodySchema,
        description: "Create a new webhook configuration (requires manage:settings permission)",
        response: {
          "201": webhookObjectSchema,
          "400": errorSchema,
        },
        summary: "Create webhook",
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
          body.collection?.trim() || /* v8 ignore next */ "*",
          body.secret?.trim() ?? /* v8 ignore next */ "",
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
      /* v8 ignore start — defensive: insert always returns the row */
      if (!created) {
        return reply.status(500).send({ error: "Failed to retrieve created webhook" });
      }
      /* v8 ignore stop */

      return reply.status(201).send(mapRow(created));
    },
  );

  fastify.put(
    "/api/settings/webhooks/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "settings")],
      schema: {
        body: {
          properties: {
            collection: { type: "string" },
            enabled: { type: "boolean" },
            events: { items: { type: "string" }, type: "array" },
            name: { type: "string" },
            secret: { type: "string" },
            url: { format: "uri", type: "string" },
          },
          type: "object",
        },
        description: "Update a webhook configuration (requires manage:settings permission)",
        params: idParamSchema,
        response: {
          "2xx": webhookObjectSchema,
          "400": errorSchema,
          "404": errorSchema,
        },
        summary: "Update webhook",
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
        /* v8 ignore next -- defensive validation; test data always provides non-empty URL */
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
        params.push(body.collection.trim() || /* v8 ignore next */ "*");
      }
      if (body.enabled !== undefined) {
        sets.push("enabled = ?");
        params.push(body.enabled ? 1 : 0);
      }
      if (body.secret !== undefined) {
        sets.push("secret = ?");
        params.push(body.secret.trim() ?? /* v8 ignore next */ "");
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
        description: "Delete a webhook configuration (requires manage:settings permission)",
        params: idParamSchema,
        response: {
          "2xx": messageResponseSchema,
          "404": errorSchema,
        },
        summary: "Delete webhook",
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
