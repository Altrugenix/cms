import { describe, it, expect } from "vitest";
import { MigrationGenerator } from "../src/migration-generator.js";
import type { CollectionDefinition, GlobalDefinition, ExistingSchema } from "../src/index.js";

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
        slug: "site-settings",
        label: "Site Settings",
        fields: [
          { name: "siteName", type: "text", validation: { required: true } },
          { name: "logo", type: "media" },
        ],
      },
    ];

    const migrations = generator.generate([], emptySchema, globals);
    expect(migrations).toHaveLength(1);

    const [m] = migrations;
    expect(m.name).toBe("create_global_site-settings");
    expect(m.up).toContain("CREATE TABLE IF NOT EXISTS");
    expect(m.up).toContain('"__cms_site_settings"');
    expect(m.up).toContain("siteName TEXT NOT NULL");
    expect(m.up).toContain("logo TEXT");
    expect(m.down).toContain("DROP TABLE IF EXISTS");
  });

  it("generates ALTER TABLE for new fields on existing global", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        slug: "site-settings",
        label: "Site Settings",
        fields: [
          { name: "siteName", type: "text" },
          { name: "newField", type: "text" },
        ],
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
    expect(m.up).toContain("ADD COLUMN newField TEXT");
  });

  it("skips globals that already exist with all fields", () => {
    const generator = new MigrationGenerator();
    const globals: GlobalDefinition[] = [
      {
        slug: "site-settings",
        label: "Site Settings",
        fields: [{ name: "siteName", type: "text" }],
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
        slug: "empty-global",
        label: "Empty Global",
        fields: [],
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
        slug: "site-settings",
        label: "Site Settings",
        fields: [{ name: "siteName", type: "text" }],
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
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
      },
    ];
    const globals: GlobalDefinition[] = [
      {
        slug: "settings",
        label: "Settings",
        fields: [{ name: "key", type: "text" }],
      },
    ];

    const migrations = generator.generate(collections, emptySchema, globals);
    expect(migrations).toHaveLength(2);
    expect(migrations[0].name).toBe("create_posts");
    expect(migrations[1].name).toBe("create_global_settings");
  });
});
