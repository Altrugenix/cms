import pg from "pg";

import type { DatabaseAdapter, ExistingSchema, Migration, QueryOptions } from "./types.js";

export interface PostgresAdapterOptions {
  connectionString: string;
  poolSize?: number;
  idleTimeoutMs?: number;
}

export class PostgresAdapter implements DatabaseAdapter {
  private pool: pg.Pool | null = null;
  private readonly options: PostgresAdapterOptions;

  constructor(options: PostgresAdapterOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    this.pool = new pg.Pool({
      connectionString: this.options.connectionString,
      idleTimeoutMillis: this.options.idleTimeoutMs ?? 30000,
      max: this.options.poolSize ?? 10,
    });
    await this.ensureMigrationsTable();
  }

  async disconnect(): Promise<void> {
    await this.pool?.end();
    this.pool = null;
  }

  private async query(sql: string, params?: unknown[]): Promise<pg.QueryResult> {
    if (!this.pool) throw new Error("Database not connected");
    return this.pool.query(sql, params);
  }

  async findOne(
    collection: string,
    id: string,
    _options?: QueryOptions,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.query(`SELECT * FROM "${collection}" WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  }

  async findMany(
    collection: string,
    options?: QueryOptions,
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const where = options?.where ?? {};
    const keys = Object.keys(where);

    let paramIndex = 0;
    const conditions: string[] = [];
    const values: unknown[] = [];
    for (const key of keys) {
      const val = where[key];
      if (Array.isArray(val)) {
        const placeholders = val.map(() => `$${++paramIndex}`);
        conditions.push(`"${key}" IN (${placeholders.join(", ")})`);
        values.push(...val);
      } else {
        paramIndex++;
        conditions.push(`"${key}" = $${paramIndex}`);
        values.push(val);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await this.query(
      `SELECT COUNT(*) as count FROM "${collection}" ${whereClause}`,
      values,
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const sortClause = options?.sort
      ? `ORDER BY ${Object.entries(options.sort)
          .map(([k, v]) => `"${k}" ${v}`)
          .join(", ")}`
      : "";

    const limitClause = options?.limit ? `LIMIT ${options.limit}` : "";
    const offsetClause = options?.offset ? `OFFSET ${options.offset}` : "";

    const dataResult = await this.query(
      `SELECT * FROM "${collection}" ${whereClause} ${sortClause} ${limitClause} ${offsetClause}`,
      values,
    );

    return { data: dataResult.rows, total };
  }

  async create(
    collection: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const columns = keys.map((k) => `"${k}"`).join(", ");

    const result = await this.query(
      `INSERT INTO "${collection}" (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return result.rows[0] as Record<string, unknown>;
  }

  async update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");

    const result = await this.query(
      `UPDATE "${collection}" SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id],
    );
    return result.rows[0] ?? null;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const result = await this.query(`DELETE FROM "${collection}" WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteMany(collection: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const result = await this.query(
      `DELETE FROM "${collection}" WHERE id IN (${placeholders})`,
      ids,
    );
    return result.rowCount ?? 0;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.query("BEGIN");
    try {
      const result = await fn();
      await this.query("COMMIT");
      return result;
    } catch (e) {
      await this.query("ROLLBACK");
      throw e;
    }
  }

  async raw(sql: string, params?: unknown[]): Promise<unknown> {
    const result = await this.query(sql, params);
    return result.rows;
  }

  async createTable(collection: string, schema: Record<string, string>): Promise<void> {
    const columns = Object.entries(schema)
      .map(([name, type]) => `"${name}" ${type}`)
      .join(", ");
    await this.query(
      `CREATE TABLE IF NOT EXISTS "${collection}" (id SERIAL PRIMARY KEY, ${columns})`,
    );
  }

  async dropTable(collection: string): Promise<void> {
    await this.query(`DROP TABLE IF EXISTS "${collection}"`);
  }

  async runMigration(migration: Migration): Promise<void> {
    await this.query(migration.up);
    await this.query("INSERT INTO __cms_migrations (id, name, executed_at) VALUES ($1, $2, $3)", [
      migration.id,
      migration.name,
      new Date().toISOString(),
    ]);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.query("SELECT id FROM __cms_migrations ORDER BY executed_at ASC");
    return result.rows.map((r) => r.id as string);
  }

  async getExistingSchema(): Promise<ExistingSchema> {
    const tables = new Map<string, string[]>();
    const result = await this.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE '__cms_%' ORDER BY table_name, ordinal_position",
    );
    for (const row of result.rows) {
      const tableName = row.table_name as string;
      const columnName = row.column_name as string;
      if (!tables.has(tableName)) tables.set(tableName, []);
      const cols = tables.get(tableName);
      if (cols) cols.push(columnName);
    }
    return { tables };
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.query(
      "CREATE TABLE IF NOT EXISTS __cms_migrations (id TEXT PRIMARY KEY, name TEXT NOT NULL, executed_at TIMESTAMP NOT NULL)",
    );
  }
}
