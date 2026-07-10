import type { DatabaseAdapter } from "@altrugenix/database";
import type { CollectionDefinition } from "@altrugenix/types";

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
  const timer = setInterval(async () => {
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
            _status: "published",
            _publishedAt: now,
          } as Record<string, unknown>);
        }
      } catch {
        // Log and continue — don't crash the scheduler
      }
    }
  }, intervalMs);

  return {
    stop: () => clearInterval(timer),
  };
}
