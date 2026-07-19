import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../src/server/lib/activity.js", () => ({
  recordActivity: vi.fn().mockRejectedValue(new Error("Activity write failed")),
}));

vi.mock("../src/server/lib/webhooks.js", () => ({
  dispatchWebhooks: vi.fn().mockRejectedValue(new Error("Webhook dispatch failed")),
}));

import { recordActivity } from "../src/server/lib/activity.js";
import { dispatchWebhooks } from "../src/server/lib/webhooks.js";

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
    getExistingSchema: async () => ({ tables: new Map() }),
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

describe("ScheduledPublisher — extra (activity/webhook error paths)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("catches recordActivity errors during scheduled publish", async () => {
    vi.useFakeTimers();
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");

    const adapter = createMockAdapter();
    adapter.raw = vi.fn().mockResolvedValue([{ id: "1" }]);
    adapter.update = vi.fn().mockResolvedValue({ _status: "published", id: "1" });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { scheduledPublishing: true },
    };

    const publisher = createScheduledPublisher(adapter, [collection], 100);

    await vi.advanceTimersByTimeAsync(200);

    expect(recordActivity).toHaveBeenCalled();
    expect(dispatchWebhooks).toHaveBeenCalled();

    publisher.stop();
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  it("catches dispatchWebhooks errors during scheduled publish without crashing", async () => {
    vi.useFakeTimers();
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");

    const adapter = createMockAdapter();
    adapter.raw = vi.fn().mockResolvedValue([{ id: "2" }]);
    adapter.update = vi.fn().mockResolvedValue({ _status: "published", id: "2" });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Pages", singular: "Page" },
      slug: "pages",
      versions: { scheduledPublishing: true },
    };

    const publisher = createScheduledPublisher(adapter, [collection], 100);

    await vi.advanceTimersByTimeAsync(200);

    expect(adapter.update).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    publisher.stop();
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  it("continues processing other collections after activity error", async () => {
    vi.useFakeTimers();
    const { createScheduledPublisher } =
      await import("../src/server/services/scheduled-publisher.js");

    const adapter = createMockAdapter();
    let callCount = 0;
    adapter.raw = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) return [{ id: String(callCount) }];
      return [];
    });
    adapter.update = vi.fn().mockResolvedValue({ _status: "published" });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const collections: CollectionDefinition[] = [
      {
        fields: [{ name: "title", type: "text" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
        versions: { scheduledPublishing: true },
      },
      {
        fields: [{ name: "title", type: "text" }],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
        versions: { scheduledPublishing: true },
      },
    ];

    const publisher = createScheduledPublisher(adapter, collections, 100);

    await vi.advanceTimersByTimeAsync(200);

    expect(adapter.update).toHaveBeenCalled();

    publisher.stop();
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });
});
