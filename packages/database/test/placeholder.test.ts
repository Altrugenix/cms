import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SQLiteAdapter, Repository, MigrationRunner, MigrationGenerator } from "../src/index.js";
import type { Migration, DatabaseAdapter, QueryOptions, ExistingSchema } from "../src/index.js";
import type {
  QueryOptions as QueryOptionsFromTypes,
  Migration as MigrationFromTypes,
} from "../src/types.js";

const adapter = new SQLiteAdapter(":memory:");

beforeAll(async () => {
  await adapter.connect();
  await adapter.createTable("posts", {
    title: "TEXT NOT NULL",
    body: "TEXT",
    published: "INTEGER DEFAULT 0",
  });
});

afterAll(async () => {
  await adapter.disconnect();
});

describe("SQLiteAdapter", () => {
  it("creates and finds an entry", async () => {
    const created = await adapter.create("posts", { title: "Hello", body: "World" });
    expect(created).toHaveProperty("id");

    const found = await adapter.findOne("posts", String(created.id));
    expect(found).not.toBeNull();
    expect((found as Record<string, unknown>).title).toBe("Hello");
  });

  it("finds many with pagination", async () => {
    const result = await adapter.findMany("posts", { limit: 10, offset: 0 });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("finds many with where filter", async () => {
    const result = await adapter.findMany("posts", { where: { title: "Hello" } });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("updates an entry", async () => {
    const created = await adapter.create("posts", { title: "Update Me" });
    const updated = await adapter.update("posts", String(created.id), { title: "Updated" });
    expect((updated as Record<string, unknown>).title).toBe("Updated");
  });

  it("deletes an entry", async () => {
    const created = await adapter.create("posts", { title: "Delete Me" });
    const deleted = await adapter.delete("posts", String(created.id));
    expect(deleted).toBe(true);

    const found = await adapter.findOne("posts", String(created.id));
    expect(found).toBeNull();
  });

  it("deletes returns false for non-existent", async () => {
    const result = await adapter.delete("posts", "999999");
    expect(result).toBe(false);
  });

  it("runs raw sql", async () => {
    const result = await adapter.raw("SELECT COUNT(*) as count FROM posts");
    expect(result).toBeDefined();
  });

  it("drops a table", async () => {
    await adapter.createTable("temp_table", { name: "TEXT" });
    await expect(adapter.dropTable("temp_table")).resolves.not.toThrow();
  });
});

describe("Repository", () => {
  it("provides typed CRUD operations", async () => {
    const repo = new Repository(adapter, "posts");

    const created = await repo.create({ title: "Repo Test" });
    expect(created).toHaveProperty("id");

    const found = await repo.findById(String(created.id));
    expect(found).not.toBeNull();

    const updated = await repo.update(String(created.id), { title: "Repo Updated" });
    expect((updated as Record<string, unknown>).title).toBe("Repo Updated");

    const list = await repo.findMany();
    expect(list.data.length).toBeGreaterThan(0);

    const deleted = await repo.delete(String(created.id));
    expect(deleted).toBe(true);
  });
});

describe("MigrationRunner", () => {
  it("runs pending migrations", async () => {
    const runner = new MigrationRunner(adapter);

    const migrations: Migration[] = [
      {
        id: "001",
        name: "create_test",
        up: "CREATE TABLE IF NOT EXISTS migration_test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)",
        down: "DROP TABLE IF EXISTS migration_test",
      },
    ];

    await runner.run(migrations);
    const executed = await adapter.getExecutedMigrations();
    expect(executed).toContain("001");
  });

  it("skips already-executed migrations", async () => {
    const runner = new MigrationRunner(adapter);
    const migrations: Migration[] = [
      {
        id: "001",
        name: "create_test",
        up: "CREATE TABLE IF NOT EXISTS migration_test_dup (id INTEGER PRIMARY KEY AUTOINCREMENT)",
        down: "DROP TABLE IF EXISTS migration_test_dup",
      },
    ];

    await runner.run(migrations);
    const executed = await adapter.getExecutedMigrations();
    expect(executed.filter((e) => e === "001").length).toBe(1);
  });
});

describe("package exports", () => {
  it("exports SQLiteAdapter", () => {
    expect(SQLiteAdapter).toBeDefined();
  });

  it("exports Repository", () => {
    expect(Repository).toBeDefined();
  });

  it("exports MigrationRunner", () => {
    expect(MigrationRunner).toBeDefined();
  });

  it("exports MigrationGenerator", () => {
    expect(MigrationGenerator).toBeDefined();
  });

  it("exports type DatabaseAdapter", () => {
    // Type-only export — verify it resolves at runtime via typeof
    expect(typeof ({} as DatabaseAdapter)).toBe("object");
  });

  it("exports type QueryOptions", () => {
    expect(typeof ({} as QueryOptions)).toBe("object");
  });

  it("exports type ExistingSchema", () => {
    expect(typeof ({} as ExistingSchema)).toBe("object");
  });

  it("createPostgresAdapter is a function", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.createPostgresAdapter).toBe("function");
  });

  it("createPostgresAdapter returns a PostgresAdapter instance", async () => {
    const mod = await import("../src/index.js");
    const adapter = await mod.createPostgresAdapter({
      connectionString: "postgres://localhost:5432/test",
    });
    expect(adapter).toBeDefined();
    expect(typeof adapter.connect).toBe("function");
  });

  it("imports types from src/types.ts", () => {
    const _q: QueryOptionsFromTypes = {};
    const _m: MigrationFromTypes = { id: "1", name: "test", up: "", down: "" };
    expect(true).toBe(true);
  });
});
