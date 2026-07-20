import type { InValue } from "@libsql/client";

import { createClient } from "@libsql/client";

import type { DatabaseAdapter, ExistingSchema, Migration, QueryOptions } from "./types.js";

type LibSqlClient = ReturnType<typeof createClient>;

function toArgs(values: unknown[]): InValue[] {
  return values.map((v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    return JSON.stringify(v);
  });
}

function parseJsonFields(row: Record<string, unknown>): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && value.length > 1) {
      const first = value[0];
      if (first === "[" || first === "{") {
        try {
          parsed[key] = JSON.parse(value);
          continue;
        } catch {
          // not valid JSON, keep as string
        }
      }
    }
    parsed[key] = value;
  }
  return parsed;
}

export class SQLiteAdapter implements DatabaseAdapter {
  private _db: LibSqlClient | null = null;
  private readonly config: { url: string; authToken?: string };

  constructor(url: string) {
    this.config = { url };
  }

  private get db(): LibSqlClient {
    if (!this._db) {
      throw new Error("SQLiteAdapter not connected. Call connect() first.");
    }
    return this._db;
  }

  async connect(): Promise<void> {
    this._db = createClient(this.config);
    await this._db.execute("PRAGMA journal_mode = WAL");
    await this._db.execute("PRAGMA foreign_keys = ON");
    await this.ensureMigrationsTable();
  }

  async disconnect(): Promise<void> {
    this._db?.close();
    this._db = null;
  }

  async findOne(collection: string, id: string): Promise<Record<string, unknown> | null> {
    const result = await this.db.execute({
      args: [id],
      sql: `SELECT * FROM "${collection}" WHERE id = ?`,
    });
    const raw = (result.rows[0] as Record<string, unknown> | undefined) ?? null;
    return raw ? parseJsonFields(raw) : null;
  }

  async findMany(
    collection: string,
    options?: QueryOptions,
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const where = options?.where ?? {};
    const keys = Object.keys(where);

    const conditions: string[] = [];
    const values: unknown[] = [];
    for (const key of keys) {
      const val = where[key];
      if (Array.isArray(val)) {
        conditions.push(`"${key}" IN (${val.map(() => "?").join(", ")})`);
        values.push(...(val as unknown[]));
      } else {
        conditions.push(`"${key}" = ?`);
        values.push(val);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await this.db.execute({
      args: toArgs(values),
      sql: `SELECT COUNT(*) as count FROM "${collection}" ${whereClause}`,
    });
    const total = Number((countResult.rows[0] as Record<string, unknown>).count);

    const sortClause = options?.sort
      ? `ORDER BY ${Object.entries(options.sort)
          .map(([k, v]) => `"${k}" ${v}`)
          .join(", ")}`
      : "";

    const limitClause = options?.limit ? `LIMIT ${options.limit}` : "";
    const offsetClause = options?.offset ? `OFFSET ${options.offset}` : "";

    const dataResult = await this.db.execute({
      args: toArgs(values),
      sql: `SELECT * FROM "${collection}" ${whereClause} ${sortClause} ${limitClause} ${offsetClause}`,
    });

    return { data: dataResult.rows.map(parseJsonFields), total };
  }

  async create(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const keys = Object.keys(data);
    const values = toArgs(Object.values(data));
    const placeholders = keys.map(() => "?").join(", ");
    const columns = keys.map((k) => `"${k}"`).join(", ");

    const result = await this.db.execute({
      args: values,
      sql: `INSERT INTO "${collection}" (${columns}) VALUES (${placeholders}) RETURNING *`,
    });

    return parseJsonFields(result.rows[0] as Record<string, unknown>);
  }

  async update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const keys = Object.keys(data);
    const values = toArgs(Object.values(data));
    const setClause = keys.map((k) => `"${k}" = ?`).join(", ");

    const result = await this.db.execute({
      args: [...values, id],
      sql: `UPDATE "${collection}" SET ${setClause} WHERE id = ? RETURNING *`,
    });

    const raw = (result.rows[0] as Record<string, unknown> | undefined) ?? null;
    return raw ? parseJsonFields(raw) : null;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const result = await this.db.execute({
      args: [id],
      sql: `DELETE FROM "${collection}" WHERE id = ?`,
    });
    return result.rowsAffected > 0;
  }

  async deleteMany(collection: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => "?").join(", ");
    const result = await this.db.execute({
      args: ids,
      sql: `DELETE FROM "${collection}" WHERE id IN (${placeholders})`,
    });
    return Number(result.rowsAffected);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.db.execute("BEGIN");
    try {
      const result = await fn();
      await this.db.execute("COMMIT");
      return result;
    } catch (e) {
      await this.db.execute("ROLLBACK");
      throw e;
    }
  }

  async raw(sql: string, params?: unknown[]): Promise<unknown> {
    const result = await this.db.execute({ args: toArgs(params ?? []), sql });
    return result.rows;
  }

  async createTable(collection: string, schema: Record<string, string>): Promise<void> {
    const columns = Object.entries(schema)
      .map(([name, type]) => `"${name}" ${type}`)
      .join(", ");
    await this.db.execute(
      `CREATE TABLE IF NOT EXISTS "${collection}" (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columns})`,
    );
  }

  async dropTable(collection: string): Promise<void> {
    await this.db.execute(`DROP TABLE IF EXISTS "${collection}"`);
  }

  async runMigration(migration: Migration): Promise<void> {
    await this.db.execute(migration.up);
    await this.db.execute({
      args: [migration.id, migration.name, new Date().toISOString()],
      sql: "INSERT INTO __cms_migrations (id, name, executed_at) VALUES (?, ?, ?)",
    });
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.db.execute(
      "SELECT id FROM __cms_migrations ORDER BY executed_at ASC",
    );
    return result.rows.map((r) => (r as Record<string, unknown>).id as string);
  }

  async getExistingSchema(): Promise<ExistingSchema> {
    const tables = new Map<string, string[]>();
    const tableResult = await this.db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '__cms_%'",
    );
    for (const row of tableResult.rows) {
      const tableName = (row as Record<string, unknown>).name as string;
      const colResult = await this.db.execute(`PRAGMA table_info("${tableName}")`);
      const columns = colResult.rows.map((r) => (r as Record<string, unknown>).name as string);
      tables.set(tableName, columns);
    }
    return { tables };
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.db.execute(
      "CREATE TABLE IF NOT EXISTS __cms_migrations (id TEXT PRIMARY KEY, name TEXT NOT NULL, executed_at TEXT NOT NULL)",
    );
  }
}
