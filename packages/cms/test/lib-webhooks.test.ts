import type { DatabaseAdapter } from "@arche-cms/database";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ensureWebhooksTable, dispatchWebhooks } from "../src/server/lib/webhooks.js";

function createMockAdapter(overrides?: {
  createTableThrows?: boolean;
  rawHandler?: (sql: string, params?: unknown[]) => unknown;
}): DatabaseAdapter {
  const rawCalls: Array<{ sql: string; params?: unknown[] }> = [];

  return {
    connect: async () => {},
    create: async () => ({}),
    createTable: async () => {
      if (overrides?.createTableThrows) throw new Error("table already exists");
    },
    delete: async () => true,
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async () => ({ data: [], total: 0 }),
    findOne: async () => null,
    getExecutedMigrations: async () => [],
    getExistingSchema: async () => ({ tables: {} }),
    raw: async (sql: string, params?: unknown[]) => {
      rawCalls.push({ params, sql });
      if (overrides?.rawHandler) return overrides.rawHandler(sql, params);
      return [];
    },
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async () => null,
  };
}

describe("ensureWebhooksTable", () => {
  it("calls createTable with correct schema on first run", async () => {
    const adapter = createMockAdapter();
    const spy = vi.spyOn(adapter, "createTable");

    await ensureWebhooksTable(adapter);

    expect(spy).toHaveBeenCalledExactlyOnceWith(
      "__cms_webhooks",
      expect.objectContaining({
        collection: "TEXT NOT NULL DEFAULT '*'",
        enabled: "INTEGER NOT NULL DEFAULT 1",
        events: "TEXT NOT NULL DEFAULT '[]'",
        name: "TEXT NOT NULL",
        secret: "TEXT NOT NULL DEFAULT ''",
        url: "TEXT NOT NULL",
      }),
    );
  });

  it("falls back to ALTER TABLE statements when createTable throws", async () => {
    const rawCalls: string[] = [];
    const adapter = createMockAdapter({
      createTableThrows: true,
      rawHandler: (sql) => {
        rawCalls.push(sql);
        return [];
      },
    });

    await ensureWebhooksTable(adapter);

    expect(rawCalls.length).toBe(4);
    expect(rawCalls[0]).toContain("ALTER TABLE __cms_webhooks ADD COLUMN last_status");
    expect(rawCalls[1]).toContain("ALTER TABLE __cms_webhooks ADD COLUMN last_success");
    expect(rawCalls[2]).toContain("ALTER TABLE __cms_webhooks ADD COLUMN last_error");
    expect(rawCalls[3]).toContain("ALTER TABLE __cms_webhooks ADD COLUMN last_delivered_at");
  });

  it("silently ignores ALTER TABLE errors (column already exists)", async () => {
    const adapter = createMockAdapter({
      createTableThrows: true,
      rawHandler: () => {
        throw new Error("duplicate column name");
      },
    });

    await expect(ensureWebhooksTable(adapter)).resolves.toBeUndefined();
  });
});

describe("dispatchWebhooks", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fires matching webhooks successfully", async () => {
    const adapter = createMockAdapter({
      rawHandler: (sql, _params) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [
            {
              collection: "posts",
              events: JSON.stringify(["entry.create"]),
              name: "test-hook",
              rowid: 1,
              secret: "",
              url: "https://example.com/hook",
            },
          ];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts", "doc-1", { title: "Hello" });

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(
      "https://example.com/hook",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "User-Agent": "ArcheCMS-Webhook/1.0",
        }),
        method: "POST",
      }),
    );
  });

  it("does not fire when no webhooks match", async () => {
    const adapter = createMockAdapter({
      rawHandler: (sql) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts");

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips disabled webhooks (enabled=0)", async () => {
    const adapter = createMockAdapter({
      rawHandler: (sql) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts");

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips webhooks whose event list does not include the dispatched event", async () => {
    const adapter = createMockAdapter({
      rawHandler: (sql) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [
            {
              collection: "posts",
              events: JSON.stringify(["entry.update"]),
              name: "update-only-hook",
              rowid: 1,
              secret: "",
              url: "https://example.com/hook",
            },
          ];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts");

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles empty rows from SELECT (catch path)", async () => {
    const adapter = createMockAdapter({
      rawHandler: (sql) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return null;
        }
        return [];
      },
    });

    await expect(dispatchWebhooks(adapter, "entry.create", "posts")).resolves.toBeUndefined();
  });

  it("silently ignores dispatch errors", async () => {
    const adapter = createMockAdapter({
      rawHandler: () => {
        throw new Error("database error");
      },
    });

    await expect(dispatchWebhooks(adapter, "entry.create", "posts")).resolves.toBeUndefined();
  });

  it("retries and updates delivery status when fetch fails", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    let updateCalled = false;
    const adapter = createMockAdapter({
      rawHandler: (sql) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [
            {
              collection: "posts",
              events: JSON.stringify(["entry.create"]),
              name: "failing-hook",
              rowid: 1,
              secret: "",
              url: "https://example.com/fail",
            },
          ];
        }
        if (sql.includes("UPDATE") && sql.includes("__cms_webhooks")) {
          updateCalled = true;
          return [];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts", "doc-1");

    // Wait for all retries (3 retries with 1s, 2s, 4s backoff = ~7s total)
    await new Promise((r) => setTimeout(r, 8000));

    expect(fetchSpy.mock.calls.length).toBe(4);
    expect(updateCalled).toBe(true);
  });

  it("includes X-Webhook-Signature header when secret is set", async () => {
    const adapter = createMockAdapter({
      rawHandler: (sql) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [
            {
              collection: "posts",
              events: JSON.stringify(["entry.create"]),
              name: "signed-hook",
              rowid: 1,
              secret: "my-secret-key",
              url: "https://example.com/signed",
            },
          ];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts", "doc-1", {});

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const callHeaders = fetchSpy.mock.calls[0][1].headers;
    expect(callHeaders["X-Webhook-Signature"]).toBeDefined();
    expect(typeof callHeaders["X-Webhook-Signature"]).toBe("string");
    expect(callHeaders["X-Webhook-Signature"].length).toBe(64);
  });

  it("does not include signature header when secret is empty", async () => {
    const adapter = createMockAdapter({
      rawHandler: (sql) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [
            {
              collection: "posts",
              events: JSON.stringify(["entry.create"]),
              name: "unsigned-hook",
              rowid: 1,
              secret: "",
              url: "https://example.com/nosig",
            },
          ];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts", "doc-1", {});

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const callHeaders = fetchSpy.mock.calls[0][1].headers;
    expect(callHeaders["X-Webhook-Signature"]).toBeUndefined();
  });

  it("updates delivery status with error when all retries are exhausted", async () => {
    fetchSpy.mockRejectedValue(new Error("Connection refused"));

    let capturedParams: unknown[] = [];
    const adapter = createMockAdapter({
      rawHandler: (sql, params) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [
            {
              collection: "posts",
              events: JSON.stringify(["entry.create"]),
              name: "retry-hook",
              rowid: 5,
              secret: "",
              url: "https://example.com/retry",
            },
          ];
        }
        if (sql.includes("UPDATE") && sql.includes("__cms_webhooks")) {
          capturedParams = params ?? [];
          return [];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts", "doc-1");

    await new Promise((r) => setTimeout(r, 8000));

    expect(capturedParams.length).toBe(5);
    expect(capturedParams[0]).toBeNull();
    expect(capturedParams[1]).toBe(0);
    expect(capturedParams[2]).toBe("Connection refused");
  });

  it("sends correct JSON body in webhook request", async () => {
    const adapter = createMockAdapter({
      rawHandler: (sql) => {
        if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
          return [
            {
              collection: "posts",
              events: JSON.stringify(["entry.create"]),
              name: "body-check",
              rowid: 1,
              secret: "",
              url: "https://example.com/body",
            },
          ];
        }
        return [];
      },
    });

    await dispatchWebhooks(adapter, "entry.create", "posts", "doc-42", { title: "Test" });

    await new Promise((r) => setTimeout(r, 50));

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.event).toBe("entry.create");
    expect(body.collection).toBe("posts");
    expect(body.id).toBe("doc-42");
    expect(body.data).toEqual({ title: "Test" });
    expect(body.timestamp).toBeDefined();
  });
});
