import type { DatabaseAdapter } from "@arche-cms/database";

export type ActivityAction = "create" | "update" | "delete" | "bulkDelete" | "upsert";

export interface ActivityEntry {
  action: ActivityAction;
  collection: string;
  documentId?: string | undefined;
  label?: string | undefined;
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
  filters?: { collection?: string | undefined; action?: string | undefined; offset?: number },
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
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters?.collection) {
    conditions.push("collection = ?");
    params.push(filters.collection);
  }
  if (filters?.action) {
    conditions.push("action = ?");
    params.push(filters.action);
  }
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const offset = filters?.offset ?? 0;
  const rows = await adapter.raw(
    `SELECT id, action, collection, document_id as documentId, label, created_at as createdAt FROM ${TABLE}${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    action: String(r.action),
    collection: String(r.collection),
    createdAt: String(r.createdAt),
    documentId: r.documentId != null ? String(r.documentId) : null,
    id: String(r.id),
    label: String(r.label),
  }));
}
