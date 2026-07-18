import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
const mockEnd = vi.fn().mockResolvedValue(undefined);

vi.mock("pg", () => {
  const MockPool = vi.fn().mockImplementation(() => ({
    end: mockEnd,
    query: mockQuery,
  }));
  return { default: { Pool: MockPool } };
});

import { PostgresAdapter } from "../src/postgres.js";

function createAdapter(options?: { poolSize?: number; idleTimeoutMs?: number }) {
  return new PostgresAdapter({
    connectionString: "postgres://user:pass@localhost:5432/testdb",
    ...options,
  });
}

describe("PostgresAdapter (unit, no real connection)", () => {
  let adapter: PostgresAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    mockEnd.mockReset();
    mockEnd.mockResolvedValue(undefined);
    adapter = createAdapter();
  });

  it("constructs with connection string", () => {
    expect(adapter).toBeDefined();
    expect(typeof adapter.connect).toBe("function");
  });

  it("constructs with poolSize and idleTimeoutMs", () => {
    const a = createAdapter({ idleTimeoutMs: 10000, poolSize: 5 });
    expect(a).toBeDefined();
  });

  it("connect creates a pool and ensures migrations table", async () => {
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    await adapter.connect();
    expect(mockQuery).toHaveBeenCalled();
    const createTableCall = mockQuery.mock.calls.find(
      (c) =>
        typeof c[0] === "string" && c[0].includes("CREATE TABLE IF NOT EXISTS __cms_migrations"),
    );
    expect(createTableCall).toBeDefined();
  });

  it("disconnect ends pool and sets to null", async () => {
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    await adapter.connect();
    mockQuery.mockReset();
    mockEnd.mockResolvedValue(undefined);
    await adapter.disconnect();
    expect(mockEnd).toHaveBeenCalled();
  });

  it("disconnect is safe when not connected", async () => {
    await expect(adapter.disconnect()).resolves.not.toThrow();
  });

  it("query throws when not connected", async () => {
    await expect(adapter.findOne("table", "1")).rejects.toThrow("Database not connected");
  });

  it("findMany throws when not connected", async () => {
    await expect(adapter.findMany("table")).rejects.toThrow("Database not connected");
  });

  it("create throws when not connected", async () => {
    await expect(adapter.create("table", {})).rejects.toThrow("Database not connected");
  });

  it("update throws when not connected", async () => {
    await expect(adapter.update("table", "1", {})).rejects.toThrow("Database not connected");
  });

  it("delete throws when not connected", async () => {
    await expect(adapter.delete("table", "1")).rejects.toThrow("Database not connected");
  });

  it("deleteMany throws when not connected", async () => {
    await expect(adapter.deleteMany("table", ["1"])).rejects.toThrow("Database not connected");
  });

  it("transaction throws when not connected", async () => {
    await expect(adapter.transaction(async () => "x")).rejects.toThrow("Database not connected");
  });

  it("raw throws when not connected", async () => {
    await expect(adapter.raw("SELECT 1")).rejects.toThrow("Database not connected");
  });

  it("createTable throws when not connected", async () => {
    await expect(adapter.createTable("t", {})).rejects.toThrow("Database not connected");
  });

  it("dropTable throws when not connected", async () => {
    await expect(adapter.dropTable("t")).rejects.toThrow("Database not connected");
  });

  it("runMigration throws when not connected", async () => {
    await expect(
      adapter.runMigration({ down: "DOWN", id: "1", name: "test", up: "UP" }),
    ).rejects.toThrow("Database not connected");
  });

  it("getExecutedMigrations throws when not connected", async () => {
    await expect(adapter.getExecutedMigrations()).rejects.toThrow("Database not connected");
  });

  it("getExistingSchema throws when not connected", async () => {
    await expect(adapter.getExistingSchema()).rejects.toThrow("Database not connected");
  });

  async function connectAndReset() {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    await adapter.connect();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
  }

  describe("findOne", () => {
    it("returns null when no rows", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const result = await adapter.findOne("posts", "1");
      expect(result).toBeNull();
    });

    it("returns first row when found", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "1", title: "Hello" }] });
      const result = await adapter.findOne("posts", "1");
      expect(result).toEqual({ id: "1", title: "Hello" });
    });
  });

  describe("findMany", () => {
    it("returns data and total with no where", async () => {
      await connectAndReset();
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: "5" }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "1" }] });
      const result = await adapter.findMany("posts", { limit: 10, offset: 0 });
      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(1);
    });

    it("returns total 0 when count result has no count property", async () => {
      await connectAndReset();
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const result = await adapter.findMany("posts");
      expect(result.total).toBe(0);
    });

    it("builds IN clause for array where values", async () => {
      await connectAndReset();
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: "2" }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const result = await adapter.findMany("posts", { where: { id: ["1", "2"] } });
      expect(result.total).toBe(2);
    });

    it("builds equality clause for scalar where values", async () => {
      await connectAndReset();
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      await adapter.findMany("posts", { where: { title: "test" } });
      const countCall = mockQuery.mock.calls[0];
      expect(countCall[0]).toContain("WHERE");
      expect(countCall[0]).toContain('"title" = $1');
    });

    it("builds sort, limit, and offset clauses", async () => {
      await connectAndReset();
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });
      await adapter.findMany("posts", {
        limit: 5,
        offset: 10,
        sort: { id: "asc", title: "desc" },
      });
      const dataCall = mockQuery.mock.calls[1];
      expect(dataCall[0]).toContain("ORDER BY");
      expect(dataCall[0]).toContain("LIMIT 5");
      expect(dataCall[0]).toContain("OFFSET 10");
    });
  });

  describe("create", () => {
    it("inserts and returns the row", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, title: "New" }] });
      const result = await adapter.create("posts", { title: "New" });
      expect(result).toEqual({ id: 1, title: "New" });
    });
  });

  describe("update", () => {
    it("updates and returns the row", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "1", title: "Upd" }] });
      const result = await adapter.update("posts", "1", { title: "Upd" });
      expect(result).toEqual({ id: "1", title: "Upd" });
    });

    it("returns null when not found", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const result = await adapter.update("posts", "999", { title: "X" });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true when row deleted", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      const result = await adapter.delete("posts", "1");
      expect(result).toBe(true);
    });

    it("returns false when no row deleted", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const result = await adapter.delete("posts", "999");
      expect(result).toBe(false);
    });

    it("returns false when rowCount is null", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: null, rows: [] });
      const result = await adapter.delete("posts", "1");
      expect(result).toBe(false);
    });
  });

  describe("deleteMany", () => {
    it("returns 0 for empty ids", async () => {
      await connectAndReset();
      const result = await adapter.deleteMany("posts", []);
      expect(result).toBe(0);
    });

    it("deletes multiple rows", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 3, rows: [] });
      const result = await adapter.deleteMany("posts", ["1", "2", "3"]);
      expect(result).toBe(3);
    });

    it("returns 0 when rowCount is null", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: null, rows: [] });
      const result = await adapter.deleteMany("posts", ["1", "2"]);
      expect(result).toBe(0);
    });
  });

  describe("transaction", () => {
    it("commits on success", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
      const result = await adapter.transaction(async () => "done");
      expect(result).toBe("done");
      const sqls = mockQuery.mock.calls.map((c) => c[0]);
      expect(sqls).toContain("BEGIN");
      expect(sqls).toContain("COMMIT");
    });

    it("rolls back on error", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
      await expect(
        adapter.transaction(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
      const sqls = mockQuery.mock.calls.map((c) => c[0]);
      expect(sqls).toContain("ROLLBACK");
    });
  });

  describe("raw", () => {
    it("returns rows", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ x: 1 }] });
      const result = await adapter.raw("SELECT 1 as x");
      expect(result).toEqual([{ x: 1 }]);
    });
  });

  describe("createTable", () => {
    it("creates a table with columns", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      await adapter.createTable("posts", { body: "TEXT", title: "TEXT" });
      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain("CREATE TABLE IF NOT EXISTS");
      expect(call[0]).toContain('"posts"');
    });
  });

  describe("dropTable", () => {
    it("drops a table", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      await adapter.dropTable("posts");
      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain("DROP TABLE IF EXISTS");
    });
  });

  describe("runMigration", () => {
    it("runs up SQL and records migration", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
      await adapter.runMigration({
        down: "DROP TABLE t",
        id: "m1",
        name: "test_migration",
        up: "CREATE TABLE t()",
      });
      const sqls = mockQuery.mock.calls.map((c) => c[0]);
      expect(sqls).toContain("CREATE TABLE t()");
      expect(sqls.some((s: string) => s.includes("INSERT INTO __cms_migrations"))).toBe(true);
    });
  });

  describe("getExecutedMigrations", () => {
    it("returns migration ids", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 2, rows: [{ id: "m1" }, { id: "m2" }] });
      const result = await adapter.getExecutedMigrations();
      expect(result).toEqual(["m1", "m2"]);
    });
  });

  describe("getExistingSchema", () => {
    it("returns tables map", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({
        rowCount: 3,
        rows: [
          { column_name: "id", table_name: "__cms_posts" },
          { column_name: "title", table_name: "__cms_posts" },
          { column_name: "id", table_name: "__cms_users" },
        ],
      });
      const result = await adapter.getExistingSchema();
      expect(result.tables.size).toBe(2);
      expect(result.tables.get("__cms_posts")).toEqual(["id", "title"]);
      expect(result.tables.get("__cms_users")).toEqual(["id"]);
    });

    it("returns empty tables when no rows", async () => {
      await connectAndReset();
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      const result = await adapter.getExistingSchema();
      expect(result.tables.size).toBe(0);
    });
  });
});
