import { describe, it, expect } from "vitest";

import type { CollectionDefinition, GlobalDefinition, ExistingSchema } from "../src/index.js";

import { MigrationGenerator } from "../src/migration-generator.js";

const emptySchema: ExistingSchema = {
  tables: new Map([
    ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
  ]),
};

describe("MigrationGenerator - globals", () => {
  it("generates CREATE TABLE for a new global", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        fields: [
          { name: "siteName", type: "text", validation: { required: true } },
          { name: "logo", type: "media" },
        ],
        label: "Site Settings",
        slug: "site-settings",
      },
    ];

    const migrations = generator.generate([], emptySchema, globals);
    expect(migrations).toHaveLength(1);

    const [m] = migrations;
    expect(m.name).toBe("create_global_site-settings");
    expect(m.up).toContain("CREATE TABLE IF NOT EXISTS");
    expect(m.up).toContain('"__cms_site_settings"');
    expect(m.up).toContain('"siteName" TEXT NOT NULL');
    expect(m.up).toContain('"logo" TEXT');
    expect(m.down).toContain("DROP TABLE IF EXISTS");
  });

  it("generates ALTER TABLE for new fields on existing global", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        fields: [
          { name: "siteName", type: "text" },
          { name: "newField", type: "text" },
        ],
        label: "Site Settings",
        slug: "site-settings",
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id"]],
        ["__cms_site_settings", ["id", "siteName"]],
      ]),
    };

    const migrations = generator.generate([], existing, globals);
    expect(migrations).toHaveLength(1);
    const [m] = migrations;
    expect(m.name).toBe("add_global_fields___cms_site_settings");
    expect(m.up).toContain("ALTER TABLE");
    expect(m.up).toContain('ADD COLUMN "newField" TEXT');
  });

  it("skips globals that already exist with all fields", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        fields: [{ name: "siteName", type: "text" }],
        label: "Site Settings",
        slug: "site-settings",
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id"]],
        ["__cms_site_settings", ["id", "siteName"]],
      ]),
    };

    const migrations = generator.generate([], existing, globals);
    expect(migrations).toHaveLength(0);
  });

  it("returns empty array for empty globals", () => {
    const generator = new MigrationGenerator();
    const migrations = generator.generate([], emptySchema, []);
    expect(migrations).toHaveLength(0);
  });

  it("returns empty array when globals is undefined", () => {
    const generator = new MigrationGenerator();
    const migrations = generator.generate([], emptySchema);
    expect(migrations).toHaveLength(0);
  });

  it("generates global with empty fields", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        fields: [],
        label: "Empty Global",
        slug: "empty-global",
      },
    ];

    const migrations = generator.generate([], emptySchema, globals);
    expect(migrations).toHaveLength(1);
    const [m] = migrations;
    expect(m.name).toBe("create_global_empty-global");
    expect(m.up).toContain("id INTEGER PRIMARY KEY AUTOINCREMENT");
  });

  it("skips globals when all fields already exist", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        fields: [{ name: "siteName", type: "text" }],
        label: "Site Settings",
        slug: "site-settings",
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id"]],
        ["__cms_site_settings", ["id", "siteName"]],
      ]),
    };

    const migrations = generator.generate([], existing, globals);
    expect(migrations).toHaveLength(0);
  });

  it("generates both collection and global migrations", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        fields: [{ name: "title", type: "text" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ];
    const globals: GlobalDefinition[] = [
      {
        fields: [{ name: "key", type: "text" }],
        label: "Settings",
        slug: "settings",
      },
    ];

    const migrations = generator.generate(collections, emptySchema, globals);
    expect(migrations).toHaveLength(2);
    expect(migrations[0].name).toBe("create_posts");
    expect(migrations[1].name).toBe("create_global_settings");
  });
});
