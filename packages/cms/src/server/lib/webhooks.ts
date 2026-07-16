import { createHmac } from "node:crypto";
import type { DatabaseAdapter } from "@arche-cms/database";

const WEBHOOKS_TABLE = "__cms_webhooks";

export interface WebhookRow {
  rowid: number;
  name: string;
  url: string;
  events: string;
  collection: string;
  enabled: number;
  secret: string;
  created_at: string;
  updated_at: string;
}

export async function ensureWebhooksTable(adapter: DatabaseAdapter): Promise<void> {
  try {
    await adapter.createTable(WEBHOOKS_TABLE, {
      name: "TEXT NOT NULL",
      url: "TEXT NOT NULL",
      events: "TEXT NOT NULL DEFAULT '[]'",
      collection: "TEXT NOT NULL DEFAULT '*'",
      enabled: "INTEGER NOT NULL DEFAULT 1",
      secret: "TEXT NOT NULL DEFAULT ''",
      created_at: "TEXT NOT NULL",
      updated_at: "TEXT NOT NULL",
    });
  } catch {
    // table already exists
  }
}

export async function dispatchWebhooks(
  adapter: DatabaseAdapter,
  event: string,
  collection: string,
  documentId?: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    const rows = (await adapter.raw(
      `SELECT rowid, name, url, events, collection, secret FROM ${WEBHOOKS_TABLE} WHERE enabled = 1 AND (collection = ? OR collection = '*')`,
      [collection],
    )) as WebhookRow[];

    const timestamp = new Date().toISOString();
    const body = JSON.stringify({ event, collection, id: documentId, data, timestamp });

    for (const webhook of rows) {
      const eventList: string[] = JSON.parse(webhook.events ?? "[]");
      if (!eventList.includes(event)) continue;

      fireWebhook(webhook.url, body, webhook.secret).catch(() => {
        // silently ignore webhook failures
      });
    }
  } catch {
    // silently ignore dispatch errors
  }
}

async function fireWebhook(url: string, body: string, secret: string): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ArcheCMS-Webhook/1.0",
  };

  if (secret) {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Webhook-Signature"] = signature;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
