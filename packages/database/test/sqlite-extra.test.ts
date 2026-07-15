import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SQLiteAdapter } from "../src/sqlite.js";

describe("SQLiteAdapter extra coverage", () => {
  let adapter: SQLiteAdapter;

  beforeAll(async () => {
    adapter = new SQLiteAdapter(":memory:");
    await adapter.connect();
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  describe("transaction rollback on error", () => {
    it("rolls back when function throws", async () => {
      await adapter.createTable("txn_test", { name: "TEXT" });
      await expect(
        adapter.transaction(async () => {
          await adapter.create("txn_test", { name: "before_fail" });
          throw new Error("intentional error");
        }),
      ).rejects.toThrow("intentional error");

      const result = await adapter.findMany("txn_test");
      expect(result.data).toHaveLength(0);
    });
  });

  describe("getExistingSchema", () => {
    it("returns tables and columns", async () => {
      await adapter.createTable("__cms_test_schema", { col_a: "TEXT", col_b: "INTEGER" });
      const schema = await adapter.getExistingSchema();
      expect(schema.tables.has("__cms_test_schema")).toBe(true);
      const cols = schema.tables.get("__cms_test_schema") ?? [];
      expect(cols).toContain("col_a");
      expect(cols).toContain("col_b");
      expect(cols).toContain("id");
    });

    it("returns only __cms_migrations when no collection tables", async () => {
      const freshAdapter = new SQLiteAdapter(":memory:");
      await freshAdapter.connect();
      const schema = await freshAdapter.getExistingSchema();
      expect(schema.tables.has("__cms_migrations")).toBe(true);
      await freshAdapter.disconnect();
    });
  });

  describe("toArgs helper", () => {
    it("handles null and undefined values", async () => {
      await adapter.createTable("toargs_test", { val: "TEXT" });
      const result = await adapter.create("toargs_test", { val: null });
      expect(result).toHaveProperty("id");
    });

    it("handles boolean values", async () => {
      await adapter.createTable("toargs_bool", { flag: "INTEGER" });
      const result = await adapter.create("toargs_bool", { flag: true });
      expect(result).toHaveProperty("id");
    });

    it("handles object values by stringifying", async () => {
      await adapter.createTable("toargs_obj", { data: "TEXT" });
      const result = await adapter.create("toargs_obj", { data: { nested: true } });
      expect(result).toHaveProperty("id");
    });
  });

  describe("findMany with sort, limit, offset", () => {
    it("applies sort, limit, and offset", async () => {
      await adapter.createTable("sort_test", { rank: "INTEGER" });
      await adapter.create("sort_test", { rank: 3 });
      await adapter.create("sort_test", { rank: 1 });
      await adapter.create("sort_test", { rank: 2 });

      const result = await adapter.findMany("sort_test", {
        sort: { rank: "asc" },
        limit: 2,
        offset: 1,
      });
      expect(result.data).toHaveLength(2);
    });

    it("uses where with array values (IN clause)", async () => {
      await adapter.createTable("in_test", { name: "TEXT" });
      const r1 = await adapter.create("in_test", { name: "a" });
      await adapter.create("in_test", { name: "b" });
      await adapter.create("in_test", { name: "c" });

      const result = await adapter.findMany("in_test", {
        where: { id: [String(r1.id)] },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe("deleteMany edge cases", () => {
    it("returns 0 for empty array", async () => {
      const result = await adapter.deleteMany("nonexistent", []);
      expect(result).toBe(0);
    });

    it("returns count for non-empty ids", async () => {
      await adapter.createTable("delmany_real", { name: "TEXT" });
      const r1 = await adapter.create("delmany_real", { name: "a" });
      const r2 = await adapter.create("delmany_real", { name: "b" });
      const deleted = await adapter.deleteMany("delmany_real", [String(r1.id), String(r2.id)]);
      expect(deleted).toBe(2);
      const remaining = await adapter.findMany("delmany_real");
      expect(remaining.total).toBe(0);
    });
  });

  describe("transaction commit on success", () => {
    it("commits and returns result", async () => {
      await adapter.createTable("txn_ok", { name: "TEXT" });
      const result = await adapter.transaction(async () => {
        await adapter.create("txn_ok", { name: "txn-item" });
        return "done";
      });
      expect(result).toBe("done");
      const rows = await adapter.findMany("txn_ok");
      expect(rows.data).toHaveLength(1);
    });
  });

  describe("runMigration", () => {
    it("executes SQL and records the migration", async () => {
      const a = new SQLiteAdapter(":memory:");
      await a.connect();
      await a.runMigration({
        id: "001",
        name: "create-test-table",
        up: "CREATE TABLE test_migrate (id INTEGER PRIMARY KEY, name TEXT)",
        down: "DROP TABLE test_migrate",
      });
      const migrations = await a.getExecutedMigrations();
      expect(migrations).toContain("001");
      const result = await a.raw(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='test_migrate'",
      );
      expect(result).toHaveLength(1);
      await a.disconnect();
    });
  });

  describe("findOne returns null for empty result", () => {
    it("returns null when no rows match", async () => {
      await adapter.createTable("findnull_test", { name: "TEXT" });
      const result = await adapter.findOne("findnull_test", "999");
      expect(result).toBeNull();
    });
  });

  describe("update returns null for missing id", () => {
    it("returns null when id not found", async () => {
      await adapter.createTable("updnull_test", { name: "TEXT" });
      const result = await adapter.update("updnull_test", "999", { name: "updated" });
      expect(result).toBeNull();
    });
  });

  describe("findMany counts with empty table", () => {
    it("returns total 0 for empty table", async () => {
      await adapter.createTable("empty_count", { name: "TEXT" });
      const result = await adapter.findMany("empty_count");
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe("raw query", () => {
    it("returns result rows", async () => {
      const result = await adapter.raw("SELECT 1 as val");
      expect(result).toBeDefined();
    });
  });

  describe("disconnect and reconnect", () => {
    it("can disconnect and reconnect", async () => {
      const a = new SQLiteAdapter(":memory:");
      await a.connect();
      await a.disconnect();
      await a.connect();
      const result = await a.raw("SELECT 1");
      expect(result).toBeDefined();
      await a.disconnect();
    });
  });

  describe("db getter throws when not connected", () => {
    it("throws for findOne", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.findOne("t", "1")).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for findMany", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.findMany("t")).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for create", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.create("t", {})).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for update", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.update("t", "1", {})).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for delete", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.delete("t", "1")).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for deleteMany", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.deleteMany("t", ["1"])).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for transaction", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.transaction(async () => {})).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for raw", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.raw("SELECT 1")).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for createTable", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.createTable("t", {})).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for dropTable", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.dropTable("t")).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for runMigration", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.runMigration({ id: "1", name: "m", up: "", down: "" })).rejects.toThrow(
        "SQLiteAdapter not connected",
      );
    });

    it("throws for getExecutedMigrations", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.getExecutedMigrations()).rejects.toThrow("SQLiteAdapter not connected");
    });

    it("throws for getExistingSchema", async () => {
      const a = new SQLiteAdapter(":memory:");
      await expect(a.getExistingSchema()).rejects.toThrow("SQLiteAdapter not connected");
    });
  });
});
