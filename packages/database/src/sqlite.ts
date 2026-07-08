import { createClient } from "@libsql/client";
import type { InValue } from "@libsql/client";
import type { DatabaseAdapter, Migration, QueryOptions } from "./types.js";

type LibSqlClient = ReturnType<typeof createClient>;

function toArgs(values: unknown[]): InValue[] {
  return values.map((v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    return String(v);
  });
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
      sql: `SELECT * FROM "${collection}" WHERE id = ?`,
      args: [id],
    });
    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async findMany(
    collection: string,
    options?: QueryOptions,
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const where = options?.where ?? {};
    const keys = Object.keys(where);
    const conditions = keys.map((k) => `"${k}" = ?`).join(" AND ");
    const whereClause = conditions ? `WHERE ${conditions}` : "";
    const values = toArgs(Object.values(where));

    const countResult = await this.db.execute({
      sql: `SELECT COUNT(*) as count FROM "${collection}" ${whereClause}`,
      args: values,
    });
    const total = Number((countResult.rows[0] as Record<string, unknown>)?.count ?? 0);

    const sortClause = options?.sort
      ? `ORDER BY ${Object.entries(options.sort)
          .map(([k, v]) => `"${k}" ${v}`)
          .join(", ")}`
      : "";

    const limitClause = options?.limit ? `LIMIT ${options.limit}` : "";
    const offsetClause = options?.offset ? `OFFSET ${options.offset}` : "";

    const dataResult = await this.db.execute({
      sql: `SELECT * FROM "${collection}" ${whereClause} ${sortClause} ${limitClause} ${offsetClause}`,
      args: values,
    });

    return { data: dataResult.rows as Record<string, unknown>[], total };
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
      sql: `INSERT INTO "${collection}" (${columns}) VALUES (${placeholders})`,
      args: values,
    });

    const id = Number(result.lastInsertRowid);
    return this.findOne(collection, String(id)) as Promise<Record<string, unknown>>;
  }

  async update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const keys = Object.keys(data);
    const values = toArgs(Object.values(data));
    const setClause = keys.map((k) => `"${k}" = ?`).join(", ");

    await this.db.execute({
      sql: `UPDATE "${collection}" SET ${setClause} WHERE id = ?`,
      args: [...values, id],
    });

    return this.findOne(collection, id);
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const result = await this.db.execute({
      sql: `DELETE FROM "${collection}" WHERE id = ?`,
      args: [id],
    });
    return result.rowsAffected > 0;
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
    const result = await this.db.execute({ sql, args: toArgs(params ?? []) });
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
      sql: "INSERT INTO __cms_migrations (id, name, executed_at) VALUES (?, ?, ?)",
      args: [migration.id, migration.name, new Date().toISOString()],
    });
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.db.execute(
      "SELECT id FROM __cms_migrations ORDER BY executed_at ASC",
    );
    return result.rows.map((r) => (r as Record<string, unknown>).id as string);
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.db.execute(
      "CREATE TABLE IF NOT EXISTS __cms_migrations (id TEXT PRIMARY KEY, name TEXT NOT NULL, executed_at TEXT NOT NULL)",
    );
  }
}
