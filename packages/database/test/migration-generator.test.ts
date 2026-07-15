import { describe, it, expect } from "vitest";
import { MigrationGenerator } from "../src/migration-generator.js";
import type { CollectionDefinition, ExistingSchema } from "../src/index.js";

const emptySchema: ExistingSchema = {
  tables: new Map([
    ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
  ]),
};

describe("MigrationGenerator", () => {
  it("generates CREATE TABLE for a new collection", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [
          { name: "title", type: "text", validation: { required: true } },
          { name: "body", type: "richText" },
          { name: "published", type: "boolean" },
        ],
      },
    ];

    const migrations = generator.generate(collections, emptySchema);
    expect(migrations).toHaveLength(1);

    const [m] = migrations;
    expect(m.name).toBe("create_posts");
    expect(m.up).toContain("CREATE TABLE IF NOT EXISTS");
    expect(m.up).toContain('"__cms_posts"');
    expect(m.up).toContain("title TEXT NOT NULL");
    expect(m.up).toContain("body TEXT");
    expect(m.up).toContain("published INTEGER");
    expect(m.down).toContain("DROP TABLE IF EXISTS");
  });

  it("generates ALTER TABLE ADD COLUMN for new fields on existing table", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [
          { name: "title", type: "text" },
          { name: "excerpt", type: "textarea" },
        ],
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
        ["__cms_posts", ["id", "title"]],
      ]),
    };

    const migrations = generator.generate(collections, existing);
    expect(migrations).toHaveLength(1);

    const [m] = migrations;
    expect(m.name).toBe("add_fields_posts");
    expect(m.up).toContain("ALTER TABLE");
    expect(m.up).toContain("ADD COLUMN excerpt TEXT");
  });

  it("skips collections that already exist with all fields", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
        ["__cms_posts", ["id", "title"]],
      ]),
    };

    const migrations = generator.generate(collections, existing);
    expect(migrations).toHaveLength(0);
  });

  it("generates migrations for multiple collections", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
      },
      {
        slug: "users",
        labels: { singular: "User", plural: "Users" },
        fields: [{ name: "email", type: "email" }],
      },
    ];

    const migrations = generator.generate(collections, emptySchema);
    expect(migrations).toHaveLength(2);
    expect(migrations[0].name).toBe("create_posts");
    expect(migrations[1].name).toBe("create_users");
  });

  it("maps all field types to SQL types", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "all-types",
        labels: { singular: "All", plural: "All" },
        fields: [
          { name: "f_text", type: "text" },
          { name: "f_number", type: "number" },
          { name: "f_boolean", type: "boolean" },
          { name: "f_date", type: "date" },
          { name: "f_email", type: "email" },
          { name: "f_json", type: "json" },
          { name: "f_relation", type: "relation", to: "users" },
          { name: "f_slug", type: "slug" },
          { name: "f_component", type: "component", component: "seo" },
        ],
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.up).toContain("f_text TEXT");
    expect(m.up).toContain("f_number REAL");
    expect(m.up).toContain("f_boolean INTEGER");
    expect(m.up).toContain("f_date TEXT");
    expect(m.up).toContain("f_email TEXT");
    expect(m.up).toContain("f_json TEXT");
    expect(m.up).toContain("f_relation TEXT");
    expect(m.up).toContain("f_slug TEXT");
    expect(m.up).toContain("f_component TEXT");
  });

  it("generates integer primary key id column", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "items",
        labels: { singular: "Item", plural: "Items" },
        fields: [{ name: "name", type: "text" }],
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.up).toContain("id INTEGER PRIMARY KEY AUTOINCREMENT");
  });

  it("adds draft system columns when versions.drafts is true", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
        versions: { drafts: true },
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.up).toContain("_status TEXT DEFAULT 'draft'");
    expect(m.up).toContain("_publishedAt TEXT");
    expect(m.up).toContain("_publishedBy TEXT");
  });

  it("uses TEXT for unknown field types", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "unknown-type",
        labels: { singular: "Unknown", plural: "Unknowns" },
        fields: [
          { name: "custom", type: "customType" as unknown as import("../src/types.js").FieldType },
        ],
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.up).toContain("custom TEXT");
  });

  it("uses TEXT for localized fields", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "localized",
        labels: { singular: "Localized", plural: "Localized" },
        fields: [
          { name: "title", type: "text", localized: true },
          { name: "count", type: "number", localized: true },
        ],
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.up).toContain("title TEXT");
    expect(m.up).toContain("count TEXT");
  });

  it("creates table with no fields and no version features", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "empty",
        labels: { singular: "Empty", plural: "Empties" },
        fields: [],
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.name).toBe("create_empty");
    expect(m.up).toContain("CREATE TABLE IF NOT EXISTS");
    expect(m.up).toContain("id INTEGER PRIMARY KEY AUTOINCREMENT");
  });

  it("adds soft delete columns when versions.softDelete is true", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
        versions: { drafts: false, softDelete: true },
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.up).toContain("_deletedAt TEXT");
    expect(m.up).toContain("_deletedBy TEXT");
  });

  it("adds soft delete columns when enabling on existing table", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
        versions: { drafts: false, softDelete: true },
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
        ["__cms_posts", ["id", "title"]],
      ]),
    };

    const [m] = generator.generate(collections, existing);
    expect(m.name).toBe("add_fields_posts");
    expect(m.up).toContain("ADD COLUMN _deletedAt");
    expect(m.up).toContain("ADD COLUMN _deletedBy");
  });

  it("adds both draft and soft delete columns together", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
        versions: { drafts: true, softDelete: true },
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.up).toContain("_status TEXT DEFAULT 'draft'");
    expect(m.up).toContain("_publishedAt TEXT");
    expect(m.up).toContain("_deletedAt TEXT");
    expect(m.up).toContain("_deletedBy TEXT");
  });

  it("adds _publishAt column when scheduledPublishing is true", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
        versions: { drafts: true, scheduledPublishing: true },
      },
    ];

    const [m] = generator.generate(collections, emptySchema);
    expect(m.up).toContain("_publishAt TEXT");
  });

  it("adds _publishAt column when enabling scheduled publishing on existing table", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
        versions: { drafts: true, scheduledPublishing: true },
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
        ["__cms_posts", ["id", "title", "_status", "_publishedAt", "_publishedBy"]],
      ]),
    };

    const [m] = generator.generate(collections, existing);
    expect(m.name).toBe("add_fields_posts");
    expect(m.up).toContain("ADD COLUMN _publishAt");
  });

  it("adds draft columns when enabling drafts on existing table", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
        versions: { drafts: true },
      },
    ];

    const existing: ExistingSchema = {
      tables: new Map([
        ["__cms_versions", ["id", "collection", "entryId", "version", "data", "createdAt"]],
        ["__cms_posts", ["id", "title"]],
      ]),
    };

    const [m] = generator.generate(collections, existing);
    expect(m.name).toBe("add_fields_posts");
    expect(m.up).toContain("ADD COLUMN _status");
    expect(m.up).toContain("ADD COLUMN _publishedAt");
    expect(m.up).toContain("ADD COLUMN _publishedBy");
  });

  it("generates versions table migration when __cms_versions does not exist", () => {
    const generator = new MigrationGenerator();
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
      },
    ];

    const existing: ExistingSchema = { tables: new Map() };
    const migrations = generator.generate(collections, existing);
    expect(migrations[0].name).toBe("create_versions");
    expect(migrations[0].up).toContain("__cms_versions");
    expect(migrations[0].up).toContain("collection TEXT");
    expect(migrations[0].up).toContain("entryId TEXT");
    expect(migrations[0].up).toContain("version INTEGER");
    expect(migrations[0].up).toContain("data TEXT");
  });
});
