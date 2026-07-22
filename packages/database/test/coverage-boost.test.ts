import type { GlobalDefinition } from "@arche-cms/types";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { CollectionDefinition, ExistingSchema } from "../src/index.js";

import { MigrationGenerator } from "../src/migration-generator.js";
import { SQLiteAdapter } from "../src/sqlite.js";

describe("SQLiteAdapter — parseJsonFields via public API", () => {
  let adapter: SQLiteAdapter;

  beforeAll(async () => {
    adapter = new SQLiteAdapter(":memory:");
    await adapter.connect();
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it("preserves invalid JSON-looking strings as-is", async () => {
    await adapter.createTable("json_edge", { data: "TEXT" });

    const created = await adapter.create("json_edge", {
      data: "{not valid json}",
    });
    expect(created.data).toBe("{not valid json}");

    const found = await adapter.findOne("json_edge", String(created.id));
    expect(found).not.toBeNull();
    expect(found?.data).toBe("{not valid json}");
  });

  it("preserves a string that looks like an array but is invalid", async () => {
    await adapter.createTable("json_edge_arr", { data: "TEXT" });

    const created = await adapter.create("json_edge_arr", {
      data: '[1, 2, "oops]',
    });
    const found = await adapter.findOne("json_edge_arr", String(created.id));
    expect(found?.data).toBe('[1, 2, "oops]');
  });

  it("parses valid JSON objects", async () => {
    await adapter.createTable("json_valid", { data: "TEXT" });

    const created = await adapter.create("json_valid", {
      data: JSON.stringify({ key: "value" }),
    });
    const found = await adapter.findOne("json_valid", String(created.id));
    expect(found?.data).toEqual({ key: "value" });
  });

  it("parses valid JSON arrays", async () => {
    await adapter.createTable("json_valid_arr", { data: "TEXT" });

    const created = await adapter.create("json_valid_arr", {
      data: JSON.stringify([1, 2, 3]),
    });
    const found = await adapter.findOne("json_valid_arr", String(created.id));
    expect(found?.data).toEqual([1, 2, 3]);
  });

  it("preserves plain strings that do not start with { or [", async () => {
    await adapter.createTable("json_plain", { data: "TEXT" });

    const created = await adapter.create("json_plain", {
      data: "just a plain string",
    });
    const found = await adapter.findOne("json_plain", String(created.id));
    expect(found?.data).toBe("just a plain string");
  });
});

const emptySchema: ExistingSchema = {
  tables: new Map([
    ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
  ]),
};

describe("MigrationGenerator — collection with fields: undefined", () => {
  it("generates a CREATE TABLE migration for a collection with no fields", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        fields: undefined as unknown as CollectionDefinition["fields"],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ];

    const migrations = generator.generate(collections, emptySchema);
    expect(migrations).toHaveLength(1);
    expect(migrations[0].name).toBe("create_posts");
    expect(migrations[0].up).toContain("CREATE TABLE IF NOT EXISTS");
    expect(migrations[0].up).toContain('"__cms_posts"');
    expect(migrations[0].up).toContain("id INTEGER PRIMARY KEY AUTOINCREMENT");
  });
});

describe("MigrationGenerator — global with fields: undefined", () => {
  it("generates a CREATE TABLE migration for a global with no fields", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        fields: undefined as unknown as GlobalDefinition["fields"],
        label: "Settings",
        slug: "settings",
      },
    ];

    const migrations = generator.generate([], emptySchema, globals);
    expect(migrations).toHaveLength(1);
    expect(migrations[0].name).toBe("create_global_settings");
    expect(migrations[0].up).toContain("CREATE TABLE IF NOT EXISTS");
    expect(migrations[0].up).toContain('"__cms_settings"');
    expect(migrations[0].up).toContain("id INTEGER PRIMARY KEY AUTOINCREMENT");
  });

  it("generates ALTER TABLE for an existing global with fields: undefined", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        fields: undefined as unknown as GlobalDefinition["fields"],
        label: "Settings",
        slug: "settings",
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
        ["__cms_settings", ["id", "siteName"]],
      ]),
    };

    const migrations = generator.generate([], existing, globals);
    expect(migrations).toHaveLength(0);
  });
});
