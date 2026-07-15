import { describe, it, expect, beforeEach } from "vitest";
import type { DatabaseAdapter } from "@arche-cms/database";
import { AccessControl } from "../src/access-control.js";

function createMockAdapter(): DatabaseAdapter {
  const roles = new Map<string, Record<string, unknown>>();
  let nextId = 1;

  return {
    findOne: async (_collection, id) => roles.get(id) ?? null,
    findMany: async (_collection, options) => {
      const all = [...roles.values()];
      const name = options?.where?.name;
      const filtered = typeof name === "string" ? all.filter((r) => r.name === name) : all;
      return { data: filtered.slice(0, options?.limit ?? 100), total: filtered.length };
    },
    create: async (_collection, data) => {
      const id = String(nextId++);
      const record = { id, ...data };
      roles.set(id, record);
      return record;
    },
    update: async (_collection, id, data) => {
      const existing = roles.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      roles.set(id, updated);
      return updated;
    },
    delete: async (_collection, id) => {
      const existed = roles.has(id);
      roles.delete(id);
      return existed;
    },
    connect: async () => {},
    disconnect: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    raw: async () => [],
    createTable: async () => {},
    dropTable: async () => {},
    runMigration: async () => {},
    getExecutedMigrations: async () => [],
  };
}

describe("AccessControl - extended coverage", () => {
  let ac: AccessControl;
  let adapter: DatabaseAdapter;

  beforeEach(async () => {
    adapter = createMockAdapter();
    ac = new AccessControl(adapter);
    await ac.init();
    await ac.seedDefaultRoles();
  });

  it("init is idempotent - second call returns early", async () => {
    await ac.init();
    const roles = await ac.getAllRoles();
    expect(roles.length).toBe(3);
  });

  it("seedDefaultRoles returns early when roles already exist", async () => {
    await ac.seedDefaultRoles();
    const roles = await ac.getAllRoles();
    expect(roles.length).toBe(3);
  });

  it("filterFields returns empty array for unknown role", async () => {
    const allowed = await ac.filterFields("nonexistent", "posts", ["title", "body"]);
    expect(allowed).toEqual([]);
  });

  it("filterFields skips fields when action does not match", async () => {
    await ac.createRole("read-only", "Read only", [{ action: "read", resource: "posts" }]);
    const allowed = await ac.filterFields("read-only", "posts", ["title"]);
    expect(allowed).toEqual(["title"]);
  });

  it("filterFields includes field when resource does not match but permission has no fields restriction", async () => {
    await ac.createRole("all-resources", "All resources", [{ action: "read", resource: "*" }]);
    const allowed = await ac.filterFields("all-resources", "posts", ["title", "secret"]);
    expect(allowed).toEqual(["title", "secret"]);
  });

  it("filterFields respects per-field permission matching", async () => {
    await ac.createRole("limited", "Limited", [
      { action: "read", resource: "posts", fields: ["title", "body"] },
    ]);
    const allowed = await ac.filterFields("limited", "posts", ["title", "body", "secret"]);
    expect(allowed).toEqual(["title", "body"]);
  });

  it("check returns false for role that has no matching resource permission", async () => {
    await ac.createRole("writer", "Write only", [{ action: "create", resource: "posts" }]);
    const result = await ac.check("writer", "read", "posts");
    expect(result).toBe(false);
  });

  it("check returns true for exact action and resource match", async () => {
    await ac.createRole("specific", "Specific", [{ action: "create", resource: "posts" }]);
    const result = await ac.check("specific", "create", "posts");
    expect(result).toBe(true);
  });

  it("filterFields skips non-matching action and non-matching resource in multi-permission role", async () => {
    await ac.createRole("mixed", "Mixed", [
      { action: "create", resource: "posts" },
      { action: "read", resource: "comments" },
      { action: "read", resource: "posts", fields: ["title"] },
    ]);
    const allowed = await ac.filterFields("mixed", "posts", ["title", "body"]);
    expect(allowed).toEqual(["title"]);
  });

  it("filterFields with all permissions mismatching action", async () => {
    await ac.createRole("write-only", "Write only", [
      { action: "create", resource: "posts" },
      { action: "update", resource: "posts" },
    ]);
    const allowed = await ac.filterFields("write-only", "posts", ["title"]);
    expect(allowed).toEqual([]);
  });

  it("deleteRole returns false for nonexistent id", async () => {
    const result = await ac.deleteRole("999");
    expect(result).toBe(false);
  });
});
