export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: Record<string, "asc" | "desc"> | undefined;
  where?: Record<string, unknown> | undefined;
  select?: string[] | undefined;
  populate?: string[] | undefined;
}

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  executedAt?: Date | undefined;
}

export interface ExistingSchema {
  tables: Map<string, string[]>; // table name → column names
}

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  findOne(
    collection: string,
    id: string,
    options?: QueryOptions,
  ): Promise<Record<string, unknown> | null>;
  findMany(
    collection: string,
    options?: QueryOptions,
  ): Promise<{ data: Record<string, unknown>[]; total: number }>;
  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null>;
  delete(collection: string, id: string): Promise<boolean>;
  deleteMany(collection: string, ids: string[]): Promise<number>;

  transaction<T>(fn: () => Promise<T>): Promise<T>;

  raw(sql: string, params?: unknown[]): Promise<unknown>;

  createTable(collection: string, schema: Record<string, string>): Promise<void>;
  dropTable(collection: string): Promise<void>;

  runMigration(migration: Migration): Promise<void>;
  getExecutedMigrations(): Promise<string[]>;
  getExistingSchema(): Promise<ExistingSchema>;
}
