import type { DatabaseAdapter } from "@arche-cms/database";

import { createHmac } from "node:crypto";

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
  last_status: number | null;
  last_success: number;
  last_error: string;
  last_delivered_at: string | null;
}

export async function ensureWebhooksTable(adapter: DatabaseAdapter): Promise<void> {
  try {
    await adapter.createTable(WEBHOOKS_TABLE, {
      collection: "TEXT NOT NULL DEFAULT '*'",
      created_at: "TEXT NOT NULL",
      enabled: "INTEGER NOT NULL DEFAULT 1",
      events: "TEXT NOT NULL DEFAULT '[]'",
      last_delivered_at: "TEXT",
      last_error: "TEXT NOT NULL DEFAULT ''",
      last_status: "INTEGER",
      last_success: "INTEGER NOT NULL DEFAULT 0",
      name: "TEXT NOT NULL",
      secret: "TEXT NOT NULL DEFAULT ''",
      updated_at: "TEXT NOT NULL",
      url: "TEXT NOT NULL",
    });
  } catch {
    // table already exists — try adding new columns for delivery tracking
    for (const stmt of [
      `ALTER TABLE ${WEBHOOKS_TABLE} ADD COLUMN last_status INTEGER`,
      `ALTER TABLE ${WEBHOOKS_TABLE} ADD COLUMN last_success INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE ${WEBHOOKS_TABLE} ADD COLUMN last_error TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE ${WEBHOOKS_TABLE} ADD COLUMN last_delivered_at TEXT`,
    ]) {
      try {
        await adapter.raw(stmt);
      } catch {
        // column already exists
      }
    }
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
    const body = JSON.stringify({ collection, data, event, id: documentId, timestamp });

    for (const webhook of rows) {
      const eventList: string[] = JSON.parse(webhook.events ?? "[]") as string[];
      if (!eventList.includes(event)) continue;

      fireWebhookWithRetry(adapter, webhook, body).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[webhooks] retry exhausted:", e);
        },
      ); /* v8 ignore stop */
    }
  } catch {
    // silently ignore dispatch errors
  }
}

async function fireWebhookWithRetry(
  adapter: DatabaseAdapter,
  webhook: WebhookRow,
  body: string,
): Promise<void> {
  const MAX_RETRIES = 3;
  const BACKOFF_MS = [1000, 2000, 4000];
  let lastError: string | null = null;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt - 1]));
    }

    try {
      const status = await fireWebhook(webhook.url, body, webhook.secret);
      lastStatus = status;
      if (status >= 200 && status < 300) {
        await updateDeliveryStatus(adapter, webhook.rowid, status, true, "");
        return;
      }
      /* v8 ignore start -- requires non-2xx HTTP response from fetch */
      lastError = `HTTP ${status}`;
      /* v8 ignore stop */
    } catch (err) {
      lastError = err instanceof Error ? err.message : /* v8 ignore next */ "Network error";
    }
  }

  await updateDeliveryStatus(
    adapter,
    webhook.rowid,
    lastStatus,
    false,
    lastError ?? /* v8 ignore next */ "Unknown error",
  );
}

async function updateDeliveryStatus(
  adapter: DatabaseAdapter,
  webhookId: number,
  status: number | null,
  success: boolean,
  error: string,
): Promise<void> {
  const now = new Date().toISOString();
  await adapter
    .raw(
      `UPDATE ${WEBHOOKS_TABLE} SET last_status = ?, last_success = ?, last_error = ?, last_delivered_at = ? WHERE rowid = ?`,
      [status, success ? 1 : 0, error, now, webhookId],
    )
    .catch(
      /* v8 ignore start */ () => {
        // best-effort — don't break webhook flow if tracking fails
      },
    ); /* v8 ignore stop */
}

async function fireWebhook(url: string, body: string, secret: string): Promise<number> {
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
    const response = await fetch(url, {
      body,
      headers,
      method: "POST",
      signal: controller.signal,
    });
    return response.status;
  } finally {
    clearTimeout(timeout);
  }
}
