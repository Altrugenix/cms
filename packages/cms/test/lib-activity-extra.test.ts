import type { DatabaseAdapter } from "@arche-cms/database";

import { describe, it, expect, vi } from "vitest";

import {
  ACTIVITY_TABLE,
  ensureActivityTable,
  fetchRecentActivity,
  recordActivity,
} from "../src/server/lib/activity.js";

function createMockAdapter(): DatabaseAdapter {
  const activity: Array<Record<string, unknown>> = [];
  return {
    connect: async () => {},
    create: async () => ({}),
    createTable: async () => {},
    delete: async () => true,
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async () => ({ data: [], total: 0 }),
    findOne: async () => null,
    getExecutedMigrations: async () => [],
    raw: async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO __cms_activity")) {
        const entry = {
          action: params?.[0] ?? "",
          collection: params?.[1] ?? "",
          createdAt: new Date().toISOString(),
          documentId: params?.[2] ?? null,
          id: String(activity.length + 1),
          label: params?.[3] ?? "",
        };
        activity.push(entry);
        return [];
      }
      if (sql.includes("SELECT") && sql.includes("__cms_activity")) {
        let filtered = [...activity].reverse();
        let paramIdx = 0;
        if (sql.includes("collection = ?")) {
          const collectionVal = params?.[paramIdx];
          filtered = filtered.filter((r) => r.collection === collectionVal);
          paramIdx++;
        }
        if (sql.includes("action = ?")) {
          const actionVal = params?.[paramIdx];
          filtered = filtered.filter((r) => r.action === actionVal);
          paramIdx++;
        }
        const limit = (params?.[paramIdx] as number) ?? 10;
        const offset = (params?.[paramIdx + 1] as number) ?? 0;
        return filtered.slice(offset, offset + limit);
      }
      if (sql.includes("CREATE TABLE")) return [];
      return [];
    },
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async () => null,
  };
}

function createFailingAdapter(): DatabaseAdapter {
  return {
    connect: async () => {},
    create: async () => ({}),
    createTable: async () => {},
    delete: async () => true,
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async () => ({ data: [], total: 0 }),
    findOne: async () => null,
    getExecutedMigrations: async () => [],
    raw: async () => {
      throw new Error("DB write failed");
    },
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async () => null,
  };
}

describe("Activity lib — extra", () => {
  it("ACTIVITY_TABLE export equals default table name", () => {
    expect(ACTIVITY_TABLE).toBe("__cms_activity");
  });

  it("ensureActivityTable calls raw with CREATE TABLE", async () => {
    const adapter = createMockAdapter();
    const spy = vi.spyOn(adapter, "raw");
    await ensureActivityTable(adapter);
    expect(spy).toHaveBeenCalledTimes(1);
    const sql = spy.mock.calls[0]?.[0] as string;
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS");
    expect(sql).toContain("__cms_activity");
  });

  it("recordActivity does not throw when adapter fails", async () => {
    const adapter = createFailingAdapter();
    await expect(
      recordActivity(adapter, {
        action: "create",
        collection: "posts",
        documentId: "1",
        label: "test",
      }),
    ).resolves.toBeUndefined();
  });

  describe("fetchRecentActivity filters", () => {
    it("returns all entries without filters", async () => {
      const adapter = createMockAdapter();
      await recordActivity(adapter, {
        action: "create",
        collection: "posts",
        label: "post-1",
      });
      await recordActivity(adapter, {
        action: "update",
        collection: "pages",
        label: "page-1",
      });

      const result = await fetchRecentActivity(adapter);
      expect(result).toHaveLength(2);
    });

    it("filters by collection", async () => {
      const adapter = createMockAdapter();
      await recordActivity(adapter, {
        action: "create",
        collection: "posts",
        label: "p1",
      });
      await recordActivity(adapter, {
        action: "create",
        collection: "pages",
        label: "pg1",
      });

      const result = await fetchRecentActivity(adapter, 10, { collection: "posts" });
      expect(result.every((r) => r.collection === "posts")).toBe(true);
    });

    it("filters by action", async () => {
      const adapter = createMockAdapter();
      await recordActivity(adapter, {
        action: "create",
        collection: "posts",
        label: "c1",
      });
      await recordActivity(adapter, {
        action: "delete",
        collection: "posts",
        label: "d1",
      });

      const result = await fetchRecentActivity(adapter, 10, { action: "delete" });
      expect(result.every((r) => r.action === "delete")).toBe(true);
    });

    it("filters by both collection and action", async () => {
      const adapter = createMockAdapter();
      await recordActivity(adapter, {
        action: "create",
        collection: "posts",
        label: "c1",
      });
      await recordActivity(adapter, {
        action: "create",
        collection: "pages",
        label: "c2",
      });
      await recordActivity(adapter, {
        action: "delete",
        collection: "posts",
        label: "d1",
      });

      const result = await fetchRecentActivity(adapter, 10, {
        action: "create",
        collection: "posts",
      });
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe("create");
      expect(result[0].collection).toBe("posts");
    });

    it("respects offset parameter", async () => {
      const adapter = createMockAdapter();
      for (let i = 0; i < 5; i++) {
        await recordActivity(adapter, {
          action: "create",
          collection: "posts",
          label: `item-${i}`,
        });
      }

      const all = await fetchRecentActivity(adapter, 10, { offset: 0 });
      const offset = await fetchRecentActivity(adapter, 10, { offset: 2 });
      expect(all.length).toBe(5);
      expect(offset.length).toBe(3);
    });

    it("respects limit parameter", async () => {
      const adapter = createMockAdapter();
      for (let i = 0; i < 5; i++) {
        await recordActivity(adapter, {
          action: "create",
          collection: "posts",
          label: `item-${i}`,
        });
      }

      const result = await fetchRecentActivity(adapter, 2);
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no entries match filter", async () => {
      const adapter = createMockAdapter();
      await recordActivity(adapter, {
        action: "create",
        collection: "posts",
        label: "p1",
      });

      const result = await fetchRecentActivity(adapter, 10, { collection: "nonexistent" });
      expect(result).toHaveLength(0);
    });

    it("maps rows with null documentId correctly", async () => {
      const adapter = createMockAdapter();
      await recordActivity(adapter, {
        action: "create",
        collection: "posts",
        label: "no-doc",
      });

      const result = await fetchRecentActivity(adapter);
      expect(result[0].documentId).toBeNull();
    });
  });
});
