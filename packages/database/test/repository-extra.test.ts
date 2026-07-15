import { describe, it, expect, vi } from "vitest";
import { Repository } from "../src/repository.js";
import type { DatabaseAdapter } from "../src/types.js";

function createMockAdapter(): DatabaseAdapter {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    findOne: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true),
    deleteMany: vi.fn().mockResolvedValue(0),
    transaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
    raw: vi.fn(),
    createTable: vi.fn(),
    dropTable: vi.fn(),
    runMigration: vi.fn(),
    getExecutedMigrations: vi.fn().mockResolvedValue([]),
    getExistingSchema: vi.fn(),
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
