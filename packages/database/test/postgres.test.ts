import { describe, it, expect, beforeAll, afterAll } from "vitest";

const PG_TEST_URL = process.env.PG_TEST_URL ?? "";

const run = PG_TEST_URL ? describe : describe.skip;

run("PostgresAdapter", () => {
  let adapter: import("../src/postgres.js").PostgresAdapter;

  beforeAll(async () => {
    const { PostgresAdapter } = await import("../src/postgres.js");
    adapter = new PostgresAdapter({
      connectionString: PG_TEST_URL,
      poolSize: 2,
    });
    await adapter.connect();
    await adapter.createTable("t_posts", {
      body: "TEXT",
      published: "BOOLEAN DEFAULT false",
      title: "TEXT NOT NULL",
    });
  });

  afterAll(async () => {
    await adapter.dropTable("t_posts");
    await adapter.disconnect();
  });

  it("creates and finds an entry", async () => {
    const created = await adapter.create("t_posts", {
      body: "World",
      title: "Hello",
    });
    expect(created).toHaveProperty("id");

    const found = await adapter.findOne("t_posts", String(created.id));
    expect(found).not.toBeNull();
    expect((found as Record<string, unknown>).title).toBe("Hello");
  });

  it("finds many with pagination", async () => {
    const result = await adapter.findMany("t_posts", {
      limit: 10,
      offset: 0,
    });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("finds many with where filter", async () => {
    const result = await adapter.findMany("t_posts", {
      where: { title: "Hello" },
    });
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("updates an entry", async () => {
    const created = await adapter.create("t_posts", { title: "Update Me" });
    const updated = await adapter.update("t_posts", String(created.id), {
      title: "Updated",
    });
    expect((updated as Record<string, unknown>).title).toBe("Updated");
  });

  it("deletes an entry", async () => {
    const created = await adapter.create("t_posts", { title: "Delete Me" });
    const deleted = await adapter.delete("t_posts", String(created.id));
    expect(deleted).toBe(true);

    const found = await adapter.findOne("t_posts", String(created.id));
    expect(found).toBeNull();
  });

  it("deletes returns false for non-existent", async () => {
    const result = await adapter.delete("t_posts", "999999");
    expect(result).toBe(false);
  });

  it("runs raw sql", async () => {
    const result = await adapter.raw("SELECT COUNT(*) as count FROM t_posts");
    expect(result).toBeDefined();
  });

  it("drops a table", async () => {
    await adapter.createTable("t_temp", { name: "TEXT" });
    await expect(adapter.dropTable("t_temp")).resolves.not.toThrow();
  });

  it("runs transactions", async () => {
    const result = await adapter.transaction(async () => {
      const item = await adapter.create("t_posts", { title: "Transaction Test" });
      return item;
    });
    expect(result).toHaveProperty("id");
  });

  it("handles pool configuration", async () => {
    const { PostgresAdapter } = await import("../src/postgres.js");
    const custom = new PostgresAdapter({
      connectionString: PG_TEST_URL,
      idleTimeoutMs: 10000,
      poolSize: 5,
    });

    await custom.connect();
    await expect(custom.raw("SELECT 1 as test")).resolves.toBeDefined();
    await custom.disconnect();
  });
});
