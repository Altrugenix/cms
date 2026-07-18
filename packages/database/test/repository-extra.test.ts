import { describe, it, expect, vi } from "vitest";

import type { DatabaseAdapter } from "../src/types.js";

import { Repository } from "../src/repository.js";

function createMockAdapter(): DatabaseAdapter {
  return {
    connect: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
    createTable: vi.fn(),
    delete: vi.fn().mockResolvedValue(true),
    deleteMany: vi.fn().mockResolvedValue(0),
    disconnect: vi.fn(),
    dropTable: vi.fn(),
    findMany: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    findOne: vi.fn().mockResolvedValue(null),
    getExecutedMigrations: vi.fn().mockResolvedValue([]),
    getExistingSchema: vi.fn(),
    raw: vi.fn(),
    runMigration: vi.fn(),
    transaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
    update: vi.fn().mockResolvedValue(null),
  };
}

describe("Repository - deleteMany", () => {
  it("delegates deleteMany to adapter", async () => {
    const adapter = createMockAdapter();
    adapter.deleteMany.mockResolvedValue(3);
    const repo = new Repository(adapter, "posts");

    const result = await repo.deleteMany(["1", "2", "3"]);
    expect(result).toBe(3);
    expect(adapter.deleteMany).toHaveBeenCalledWith("posts", ["1", "2", "3"]);
  });
});

describe("Repository - transaction", () => {
  it("delegates transaction to adapter with repo reference", async () => {
    const adapter = createMockAdapter();
    const repo = new Repository(adapter, "posts");

    const result = await repo.transaction(async (r) => {
      expect(r).toBe(repo);
      return "done";
    });
    expect(result).toBe("done");
    expect(adapter.transaction).toHaveBeenCalled();
  });
});
