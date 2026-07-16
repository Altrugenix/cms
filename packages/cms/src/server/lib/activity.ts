import type { DatabaseAdapter } from "@arche-cms/database";

export type ActivityAction = "create" | "update" | "delete" | "bulkDelete" | "upsert";

export interface ActivityEntry {
  action: ActivityAction;
  collection: string;
  documentId?: string;
  label?: string;
}

const TABLE = process.env.CMS_ACTIVITY_TABLE || "__cms_activity";
export const ACTIVITY_TABLE = TABLE;

export async function ensureActivityTable(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      collection TEXT NOT NULL DEFAULT '',
      document_id TEXT,
      label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  );
}

export async function recordActivity(
  adapter: DatabaseAdapter,
  entry: ActivityEntry,
): Promise<void> {
  try {
    await adapter.raw(
      `INSERT INTO ${TABLE} (action, collection, document_id, label) VALUES (?, ?, ?, ?)`,
      [entry.action, entry.collection, entry.documentId ?? null, entry.label ?? ""],
    );
  } catch {
    // silently ignore recording errors
  }
}

export async function fetchRecentActivity(
  adapter: DatabaseAdapter,
  limit = 10,
): Promise<
  Array<{
    id: string;
    action: string;
    collection: string;
    documentId: string | null;
    label: string;
    createdAt: string;
  }>
> {
  const rows = await adapter.raw(
    `SELECT id, action, collection, document_id as documentId, label, created_at as createdAt FROM ${TABLE} ORDER BY id DESC LIMIT ?`,
    [limit],
  );
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    action: String(r.action),
    collection: String(r.collection),
    documentId: r.documentId != null ? String(r.documentId) : null,
    label: String(r.label),
    createdAt: String(r.createdAt),
  }));
}
