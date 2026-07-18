import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect, vi, afterEach } from "vitest";

function createMockAdapter(): DatabaseAdapter {
  const store = new Map<string, Record<string, unknown>>();
  let nextId = 1;
  return {
    connect: async () => {},
    create: async (_table, data) => {
      const id = String(nextId++);
      const record = { id, ...data };
      store.set(id, record);
      return record;
    },
    createTable: async () => {},
    delete: async () => true,
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_table, opts) => {
      const all = [...store.values()];
      return { data: all.slice(0, opts?.limit ?? 100), total: all.length };
    },
    findOne: async (_table, id) => store.get(id) ?? null,
    getExecutedMigrations: async () => [],
    raw: async (_sql, _params) => [],
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async (_table, id, data) => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      store.set(id, updated);
      return updated;
    },
  };
}

describe("ScheduledPublisher", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a stop function", async () => {
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");
    const adapter = createMockAdapter();
    const publisher = createScheduledPublisher(adapter, []);
    expect(typeof publisher.stop).toBe("function");
    publisher.stop();
  });

  it("does not crash with empty collections list", async () => {
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");
    const adapter = createMockAdapter();
    const publisher = createScheduledPublisher(adapter, [], 50);
    await new Promise((r) => setTimeout(r, 100));
    publisher.stop();
  });

  it("publishes scheduled entries", async () => {
    vi.useFakeTimers();
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");

    const adapter = createMockAdapter();
    // Mock raw to return a row needing publication
    const mockRaw = vi.fn().mockResolvedValue([{ id: 1 }]);
    adapter.raw = mockRaw;
    const updateSpy = vi.fn().mockResolvedValue({ _status: "published", id: "1" });
    adapter.update = updateSpy;

    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { scheduledPublishing: true },
    };

    const publisher = createScheduledPublisher(adapter, [collection], 100);

    // Wait for publisher to fire
    await vi.advanceTimersByTimeAsync(150);

    expect(mockRaw).toHaveBeenCalledWith(
      expect.stringContaining("SELECT id FROM"),
      expect.arrayContaining([expect.any(String)]),
    );
    expect(updateSpy).toHaveBeenCalledWith(
      expect.stringContaining("__cms_posts"),
      "1",
      expect.objectContaining({ _status: "published" }),
    );

    publisher.stop();
    vi.useRealTimers();
  });

  it("skips collections without scheduledPublishing", async () => {
    vi.useFakeTimers();
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");

    const adapter = createMockAdapter();
    const mockRaw = vi.fn();
    adapter.raw = mockRaw;

    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };

    const publisher = createScheduledPublisher(adapter, [collection], 50);
    await vi.advanceTimersByTimeAsync(100);

    expect(mockRaw).not.toHaveBeenCalled();

    publisher.stop();
    vi.useRealTimers();
  });

  it("handles raw query errors gracefully", async () => {
    vi.useFakeTimers();
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");

    const adapter = createMockAdapter();
    adapter.raw = vi.fn().mockRejectedValue(new Error("DB error"));

    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { scheduledPublishing: true },
    };

    const publisher = createScheduledPublisher(adapter, [collection], 50);
    await vi.advanceTimersByTimeAsync(100);

    // Should not throw — errors are silently caught
    publisher.stop();
    vi.useRealTimers();
  });

  it("handles empty raw results gracefully", async () => {
    vi.useFakeTimers();
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");

    const adapter = createMockAdapter();
    adapter.raw = vi.fn().mockResolvedValue([]);

    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { scheduledPublishing: true },
    };

    const publisher = createScheduledPublisher(adapter, [collection], 50);
    await vi.advanceTimersByTimeAsync(100);

    // Should not call update when no rows returned
    expect(adapter.raw).toHaveBeenCalled();

    publisher.stop();
    vi.useRealTimers();
  });
});
