import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SQLiteAdapter } from "../src/sqlite.js";
import { Repository } from "../src/repository.js";
import { MigrationRunner } from "../src/migration.js";
import type { Migration } from "../src/types.js";

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
