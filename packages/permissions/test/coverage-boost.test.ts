import type { DatabaseAdapter } from "@arche-cms/database";

import { describe, it, expect, beforeEach } from "vitest";

import { AccessControl } from "../src/access-control.js";

function createMockAdapterWithCorruptedRoles(): DatabaseAdapter {
  const store = new Map<string, Record<string, unknown>>();
  let nextId = 1;

  return {
    connect: async () => {},
    create: async (_collection, data) => {
      const id = String(nextId++);
      const record = { id, ...data };
      store.set(id, record);
      return record;
    },
    createTable: async () => {},
    delete: async (_collection, id) => {
      return store.delete(id);
    },
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_collection, options) => {
      const all = [...store.values()];
      const name = options?.where?.name;
      const filtered = typeof name === "string" ? all.filter((r) => r.name === name) : all;
      return { data: filtered.slice(0, options?.limit ?? 100), total: filtered.length };
    },
    findOne: async (_collection, id) => store.get(id) ?? null,
    getExecutedMigrations: async () => [],
    raw: async () => [],
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async (_collection, id, data) => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      store.set(id, updated);
      return updated;
    },
  };
}

describe("AccessControl — corrupted roles cleanup", () => {
  let adapter: DatabaseAdapter;

  beforeEach(() => {
    adapter = createMockAdapterWithCorruptedRoles();
  });

  it("deletes corrupted records and re-creates default roles", async () => {
    await adapter.createTable("__cms_roles", {
      name: "TEXT NOT NULL",
      permissions: "TEXT",
    });

    await adapter.create("__cms_roles", {
      createdAt: new Date().toISOString(),
      description: "Corrupted role",
      name: "broken_admin",
      permissions: "not-an-array",
      updatedAt: new Date().toISOString(),
    });

    await adapter.create("__cms_roles", {
      createdAt: new Date().toISOString(),
      description: "Another corrupted",
      name: "broken_editor",
      permissions: '{"foo":"bar"}',
      updatedAt: new Date().toISOString(),
    });

    const preSeed = await adapter.findMany("__cms_roles");
    expect(preSeed.total).toBe(2);

    const ac = new AccessControl(adapter);
    await ac.init();
    await ac.seedDefaultRoles();

    const roles = await ac.getAllRoles();
    expect(roles).toHaveLength(3);
    const names = roles.map((r) => r.name).sort();
    expect(names).toEqual(["admin", "editor", "viewer"]);
  });

  it("does not re-seed when roles are already valid", async () => {
    await adapter.createTable("__cms_roles", {
      name: "TEXT NOT NULL",
      permissions: "TEXT",
    });

    const ac = new AccessControl(adapter);
    await ac.init();
    await ac.seedDefaultRoles();

    const preCount = await adapter.findMany("__cms_roles");
    expect(preCount.total).toBe(3);

    await ac.seedDefaultRoles();

    const postCount = await adapter.findMany("__cms_roles");
    expect(postCount.total).toBe(3);
  });
});
