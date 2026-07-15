import { describe, it, expect, vi } from "vitest";
import { MigrationRunner } from "../src/migration.js";
import type { DatabaseAdapter, Migration } from "../src/types.js";

function createMockAdapter(): DatabaseAdapter {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    transaction: vi.fn(),
    raw: vi.fn().mockResolvedValue([]),
    createTable: vi.fn(),
    dropTable: vi.fn(),
    runMigration: vi.fn(),
    getExecutedMigrations: vi.fn().mockResolvedValue([]),
    getExistingSchema: vi.fn(),
  };
}

describe("MigrationRunner", () => {
  it("rollback with no targetId rolls back all executed migrations in reverse", async () => {
    const adapter = createMockAdapter();
    adapter.getExecutedMigrations.mockResolvedValue(["001", "002", "003"]);

    const runner = new MigrationRunner(adapter);
    const migrations: Migration[] = [
      { id: "001", name: "m1", up: "UP1", down: "DOWN1" },
      { id: "002", name: "m2", up: "UP2", down: "DOWN2" },
      { id: "003", name: "m3", up: "UP3", down: "DOWN3" },
    ];

    await runner.rollback(migrations);

    expect(adapter.raw).toHaveBeenCalledTimes(3);
    expect(adapter.raw).toHaveBeenCalledWith("DOWN3");
    expect(adapter.raw).toHaveBeenCalledWith("DOWN2");
    expect(adapter.raw).toHaveBeenCalledWith("DOWN1");
  });

  it("rollback with targetId stops before that migration", async () => {
    const adapter = createMockAdapter();
    adapter.getExecutedMigrations.mockResolvedValue(["001", "002", "003"]);

    const runner = new MigrationRunner(adapter);
    const migrations: Migration[] = [
      { id: "001", name: "m1", up: "UP1", down: "DOWN1" },
      { id: "002", name: "m2", up: "UP2", down: "DOWN2" },
      { id: "003", name: "m3", up: "UP3", down: "DOWN3" },
    ];

    await runner.rollback(migrations, "002");

    expect(adapter.raw).toHaveBeenCalledTimes(1);
    expect(adapter.raw).toHaveBeenCalledWith("DOWN3");
  });

  it("rollback skips migrations not in executed list", async () => {
    const adapter = createMockAdapter();
    adapter.getExecutedMigrations.mockResolvedValue(["001", "003"]);

    const runner = new MigrationRunner(adapter);
    const migrations: Migration[] = [
      { id: "001", name: "m1", up: "UP1", down: "DOWN1" },
      { id: "002", name: "m2", up: "UP2", down: "DOWN2" },
      { id: "003", name: "m3", up: "UP3", down: "DOWN3" },
    ];

    await runner.rollback(migrations);

    expect(adapter.raw).toHaveBeenCalledTimes(2);
    expect(adapter.raw).toHaveBeenCalledWith("DOWN3");
    expect(adapter.raw).toHaveBeenCalledWith("DOWN1");
  });

  it("rollback with no executed migrations does nothing", async () => {
    const adapter = createMockAdapter();
    adapter.getExecutedMigrations.mockResolvedValue([]);

    const runner = new MigrationRunner(adapter);
    await runner.rollback([{ id: "001", name: "m1", up: "UP1", down: "DOWN1" }]);

    expect(adapter.raw).not.toHaveBeenCalled();
  });
});
