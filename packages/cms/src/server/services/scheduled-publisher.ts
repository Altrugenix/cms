import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition } from "@arche-cms/types";

import { recordActivity } from "../lib/activity.js";
import { dispatchWebhooks } from "../lib/webhooks.js";

function collectionTableName(slug: string): string {
  return `__cms_${slug.replace(/-/g, "_")}`;
}

export interface ScheduledPublisher {
  stop: () => void;
}

export function createScheduledPublisher(
  adapter: DatabaseAdapter,
  collections: CollectionDefinition[],
  intervalMs = 60_000,
): ScheduledPublisher {
  const timer = setInterval(() => {
    void (async () => {
      for (const collection of collections) {
        if (!collection.versions?.scheduledPublishing) continue;
        const tableName = collectionTableName(collection.slug);
        try {
          const now = new Date().toISOString();
          const result = await adapter.raw(
            `SELECT id FROM "${tableName}" WHERE _publishAt IS NOT NULL AND _publishAt <= ? AND _status = 'draft' AND _deletedAt IS NULL`,
            [now],
          );
          const rows = result as Array<{ id: number }>;
          if (rows.length === 0) continue;
          for (const row of rows) {
            await adapter.update(tableName, String(row.id), {
              _publishedAt: now,
              _status: "published",
            } as Record<string, unknown>);
            const docId = String(row.id);
            recordActivity(adapter, {
              action: "update",
              collection: collection.slug,
              documentId: docId,
              label: "auto-published",
            }).catch((e: unknown) => {
              console.error("[activity] record failed:", e);
            });
            dispatchWebhooks(adapter, "collection:published", collection.slug, docId).catch(
              (e: unknown) => {
                console.error("[webhooks] dispatch failed:", e);
              },
            );
          }
        } catch (e) {
          console.error("[scheduled-publisher] publish failed:", e);
        }
      }
    })();
  }, intervalMs);

  return {
    stop: () => clearInterval(timer),
  };
}
