/* eslint-disable no-secrets/no-secrets */
import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { createBulkPublishHandler, createBulkUnpublishHandler } from "../src/handlers.js";

function createMockAdapter() {
  const store = new Map<string, Record<string, unknown>>();
  return {
    create: vi.fn(async (_table: string, data: Record<string, unknown>) => {
      const id = String(store.size + 1);
      store.set(id, { id, ...data });
      return { id, ...data };
    }),
    delete: vi.fn(async () => true),
    findMany: vi.fn(async () => ({ data: [...store.values()], total: store.size })),
    findOne: vi.fn(async (_table: string, id: string) => store.get(id) ?? null),
    store,
    update: vi.fn(async (_table: string, id: string, data: Record<string, unknown>) => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      store.set(id, updated);
      return updated;
    }),
  };
}

const postsCollection: CollectionDefinition = {
  fields: [{ name: "title", type: "text" }],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

function makeCtx(body?: unknown) {
  return {
    body: body as Record<string, unknown>,
    params: {},
    query: {},
  };
}

describe("createBulkPublishHandler", () => {
  let adapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    adapter = createMockAdapter();
    adapter.store.set("1", { _status: "draft", id: "1", title: "Post 1" });
    adapter.store.set("2", { _status: "draft", id: "2", title: "Post 2" });
  });

  it("publishes multiple entries", async () => {
    const handler = createBulkPublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx({ ids: ["1", "2"] }));
    expect(result.statusCode).toBe(200);
    expect((result.body as Record<string, unknown>).published).toBe(2);
    expect(adapter.update).toHaveBeenCalledTimes(2);
    expect(adapter.update).toHaveBeenCalledWith(
      expect.any(String),
      "1",
      expect.objectContaining({ _status: "published" }),
    );
  });

  it("returns 400 for empty ids array", async () => {
    const handler = createBulkPublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx({ ids: [] }));
    expect(result.statusCode).toBe(400);
    expect((result.body as Record<string, unknown>).error).toContain("empty");
  });

  it("returns 400 for missing body", async () => {
    const handler = createBulkPublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx(undefined));
    expect(result.statusCode).toBe(400);
  });

  it("returns 400 for body without ids", async () => {
    const handler = createBulkPublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx({ foo: "bar" }));
    expect(result.statusCode).toBe(400);
  });

  it("returns 500 when adapter throws", async () => {
    adapter.update.mockRejectedValueOnce(new Error("DB error"));
    const handler = createBulkPublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx({ ids: ["1"] }));
    expect(result.statusCode).toBe(500);
  });
});

describe("createBulkUnpublishHandler", () => {
  let adapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    adapter = createMockAdapter();
    adapter.store.set("1", { _status: "published", id: "1", title: "Post 1" });
  });

  it("unpublishes entries", async () => {
    const handler = createBulkUnpublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx({ ids: ["1"] }));
    expect(result.statusCode).toBe(200);
    expect((result.body as Record<string, unknown>).unpublished).toBe(1);
    expect(adapter.update).toHaveBeenCalledWith(
      expect.any(String),
      "1",
      expect.objectContaining({ _publishedAt: null, _publishedBy: null, _status: "draft" }),
    );
  });

  it("returns 400 for empty ids array", async () => {
    const handler = createBulkUnpublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx({ ids: [] }));
    expect(result.statusCode).toBe(400);
  });

  it("returns 400 for missing body", async () => {
    const handler = createBulkUnpublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx(undefined));
    expect(result.statusCode).toBe(400);
  });

  it("returns 500 when adapter throws", async () => {
    adapter.update.mockRejectedValueOnce(new Error("DB error"));
    const handler = createBulkUnpublishHandler(postsCollection, adapter);
    const result = await handler(makeCtx({ ids: ["1"] }));
    expect(result.statusCode).toBe(500);
  });
});
