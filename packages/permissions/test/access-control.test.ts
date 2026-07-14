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

describe("AccessControl", () => {
  let ac: AccessControl;
  let adapter: DatabaseAdapter;

  beforeEach(async () => {
    adapter = createMockAdapter();
    ac = new AccessControl(adapter);
    await ac.init();
    await ac.seedDefaultRoles();
  });

  describe("seedDefaultRoles", () => {
    it("creates admin, editor, and viewer roles", async () => {
      const roles = await ac.getAllRoles();
      expect(roles).toHaveLength(3);
      const names = roles.map((r) => r.name).sort();
      expect(names).toEqual(["admin", "editor", "viewer"]);
    });
  });

  describe("getRole", () => {
    it("returns a role by name", async () => {
      const role = await ac.getRole("admin");
      expect(role).not.toBeNull();
      expect(role?.name).toBe("admin");
    });

    it("returns null for unknown role", async () => {
      const role = await ac.getRole("unknown");
      expect(role).toBeNull();
    });
  });

  describe("getRoleById", () => {
    it("returns a role by id", async () => {
      const roles = await ac.getAllRoles();
      const role = await ac.getRoleById(roles[0].id);
      expect(role).not.toBeNull();
      expect(role?.id).toBe(roles[0].id);
    });

    it("returns null for unknown id", async () => {
      const role = await ac.getRoleById("nonexistent");
      expect(role).toBeNull();
    });
  });

  describe("createRole", () => {
    it("creates a new custom role", async () => {
      const role = await ac.createRole("custom_role", "Custom role", [
        { action: "read", resource: "posts" },
      ]);
      expect(role.name).toBe("custom_role");
      expect(role.permissions).toHaveLength(1);
    });

    it("throws if role name already exists", async () => {
      await expect(ac.createRole("admin", "Duplicate", [])).rejects.toThrow("already exists");
    });
  });

  describe("updateRole", () => {
    it("updates an existing role", async () => {
      const roles = await ac.getAllRoles();
      const adminId = roles[0].id;
      const updated = await ac.updateRole(adminId, { description: "Updated description" });
      expect(updated).not.toBeNull();
      expect(updated?.description).toBe("Updated description");
    });

    it("returns null for unknown role", async () => {
      const result = await ac.updateRole("nonexistent", { name: "test" });
      expect(result).toBeNull();
    });
  });

  describe("deleteRole", () => {
    it("deletes a role", async () => {
      const role = await ac.createRole("temp", "Temp", []);
      const deleted = await ac.deleteRole(role.id);
      expect(deleted).toBe(true);
      const fetched = await ac.getRole("temp");
      expect(fetched).toBeNull();
    });
  });

  describe("check", () => {
    it("admin can do anything", async () => {
      const result = await ac.check("admin", "delete", "any-resource");
      expect(result).toBe(true);
    });

    it("editor can read any resource", async () => {
      const result = await ac.check("editor", "read", "posts");
      expect(result).toBe(true);
    });

    it("editor cannot delete any resource", async () => {
      const result = await ac.check("editor", "delete", "posts");
      expect(result).toBe(false);
    });

    it("viewer cannot create", async () => {
      const result = await ac.check("viewer", "create", "posts");
      expect(result).toBe(false);
    });

    it("unknown role returns false", async () => {
      const result = await ac.check("nonexistent", "read", "posts");
      expect(result).toBe(false);
    });
  });

  describe("filterFields", () => {
    it("returns all fields for admin role", async () => {
      const allowed = await ac.filterFields("admin", "posts", ["title", "body", "secret"]);
      expect(allowed).toEqual(["title", "body", "secret"]);
    });

    it("returns filtered fields when permission has field restrictions", async () => {
      await ac.createRole("restricted", "Restricted", [
        { action: "read", resource: "posts", fields: ["title"] },
      ]);
      const allowed = await ac.filterFields("restricted", "posts", ["title", "body", "secret"]);
      expect(allowed).toEqual(["title"]);
    });
  });
});
