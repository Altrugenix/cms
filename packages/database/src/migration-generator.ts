import type { CollectionDefinition, GlobalDefinition, FieldDefinition } from "@arche-cms/types";
import type { Migration, ExistingSchema } from "./types.js";

const fieldToSqlType: Record<string, string> = {
  text: "TEXT",
  textarea: "TEXT",
  number: "REAL",
  boolean: "INTEGER",
  date: "TEXT",
  datetime: "TEXT",
  email: "TEXT",
  password: "TEXT",
  url: "TEXT",
  json: "TEXT",
  richText: "TEXT",
  markdown: "TEXT",
  code: "TEXT",
  color: "TEXT",
  media: "TEXT",
  upload: "TEXT",
  select: "TEXT",
  multiSelect: "TEXT",
  radio: "TEXT",
  checkbox: "INTEGER",
  relation: "TEXT",
  component: "TEXT",
  dynamicZone: "TEXT",
  array: "TEXT",
  object: "TEXT",
  tabs: "TEXT",
  group: "TEXT",
  repeater: "TEXT",
  slug: "TEXT",
};

function sqlTypeForField(field: FieldDefinition): string {
  const baseType = fieldToSqlType[field.type] ?? "TEXT";
  const type = field.localized ? "TEXT" : baseType;
  const nullable = field.validation?.required ? " NOT NULL" : "";
  return `${type}${nullable}`;
}

function collectionTableName(slug: string): string {
  return `__cms_${slug.replace(/-/g, "_")}`;
}

function fieldColumnName(name: string): string {
  return name.replace(/-/g, "_");
}

function hasDrafts(collection: CollectionDefinition): boolean {
  return collection.versions?.drafts === true;
}

function draftColumns(): string[] {
  return ["_status", "_publishedAt", "_publishedBy"];
}

function hasScheduledPublishing(collection: CollectionDefinition): boolean {
  return collection.versions?.scheduledPublishing === true;
}

function scheduledPublishColumns(): string[] {
  return ["_publishAt"];
}

function hasSoftDelete(collection: CollectionDefinition): boolean {
  return collection.versions?.softDelete === true;
}

function softDeleteColumns(): string[] {
  return ["_deletedAt", "_deletedBy"];
}

const VERSIONS_TABLE = "__cms_versions";

export class MigrationGenerator {
  generate(
    collections: CollectionDefinition[],
    existing: ExistingSchema,
    globals?: GlobalDefinition[],
  ): Migration[] {
    const migrations: Migration[] = [];
    const now = new Date().toISOString().replace(/[:.]/g, "-");

    if (!existing.tables.has(VERSIONS_TABLE)) {
      migrations.push(this.createVersionsTableMigration(now));
    }

    for (const collection of collections) {
      const tableName = collectionTableName(collection.slug);
      const existingColumns = existing.tables.get(tableName) ?? [];

      if (!existing.tables.has(tableName)) {
        migrations.push(this.createTableMigration(collection, tableName, now));
      } else {
        const newColumns = collection.fields.filter(
          (f) => !existingColumns.includes(fieldColumnName(f.name)),
        );
        const missingDraftColumns = hasDrafts(collection)
          ? draftColumns().filter((c) => !existingColumns.includes(c))
          : [];
        const missingSoftDeleteColumns = hasSoftDelete(collection)
          ? softDeleteColumns().filter((c) => !existingColumns.includes(c))
          : [];
        const missingScheduledPublishColumns = hasScheduledPublishing(collection)
          ? scheduledPublishColumns().filter((c) => !existingColumns.includes(c))
          : [];
        if (
          newColumns.length > 0 ||
          missingDraftColumns.length > 0 ||
          missingSoftDeleteColumns.length > 0 ||
          missingScheduledPublishColumns.length > 0
        ) {
          migrations.push(
            this.addColumnsMigration(
              collection,
              newColumns,
              missingDraftColumns,
              missingSoftDeleteColumns,
              missingScheduledPublishColumns,
              tableName,
              now,
            ),
          );
        }
      }
    }

    if (globals) {
      for (const globalDef of globals) {
        const tableName = collectionTableName(globalDef.slug);
        if (!existing.tables.has(tableName)) {
          migrations.push(this.createGlobalTableMigration(globalDef, tableName, now));
        } else {
          const existingColumns = existing.tables.get(tableName) ?? [];
          const newColumns = globalDef.fields.filter(
            (f) => !existingColumns.includes(fieldColumnName(f.name)),
          );
          if (newColumns.length > 0) {
            migrations.push(this.addGlobalColumnsMigration(newColumns, tableName, now));
          }
        }
      }
    }

    return migrations;
  }

  private createGlobalTableMigration(
    globalDef: GlobalDefinition,
    tableName: string,
    timestamp: string,
  ): Migration {
    const columns = globalDef.fields.map(
      (f) => `  ${fieldColumnName(f.name)} ${sqlTypeForField(f)}`,
    );
    const columnsStr = columns.length > 0 ? `,\n${columns.join(",\n")}` : "";
    const up = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  id INTEGER PRIMARY KEY AUTOINCREMENT${columnsStr}\n);`;
    const down = `DROP TABLE IF EXISTS "${tableName}";`;

    return {
      id: `mig_${timestamp}_create_global_${globalDef.slug}`,
      name: `create_global_${globalDef.slug}`,
      up,
      down,
    };
  }

  private addGlobalColumnsMigration(
    newFields: FieldDefinition[],
    tableName: string,
    timestamp: string,
  ): Migration {
    const upLines = newFields.map(
      (f) =>
        `ALTER TABLE "${tableName}" ADD COLUMN ${fieldColumnName(f.name)} ${sqlTypeForField(f)};`,
    );
    const downLines = newFields.map(
      (f) => `-- WARNING: Cannot automatically revert ADD COLUMN for ${fieldColumnName(f.name)}`,
    );

    return {
      id: `mig_${timestamp}_add_global_fields_${tableName}`,
      name: `add_global_fields_${tableName}`,
      up: upLines.join("\n"),
      down: downLines.join("\n"),
    };
  }

  private createTableMigration(
    collection: CollectionDefinition,
    tableName: string,
    timestamp: string,
  ): Migration {
    const columns = collection.fields.map(
      (f) => `  ${fieldColumnName(f.name)} ${sqlTypeForField(f)}`,
    );
    if (hasDrafts(collection)) {
      columns.push("  _status TEXT DEFAULT 'draft'");
      columns.push("  _publishedAt TEXT");
      columns.push("  _publishedBy TEXT");
    }
    if (hasScheduledPublishing(collection)) {
      columns.push("  _publishAt TEXT");
    }
    if (hasSoftDelete(collection)) {
      columns.push("  _deletedAt TEXT");
      columns.push("  _deletedBy TEXT");
    }
    const columnsStr = columns.length > 0 ? `,\n${columns.join(",\n")}` : "";
    const up = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  id INTEGER PRIMARY KEY AUTOINCREMENT${columnsStr}\n);`;
    const down = `DROP TABLE IF EXISTS "${tableName}";`;

    return {
      id: `mig_${timestamp}_create_${collection.slug}`,
      name: `create_${collection.slug}`,
      up,
      down,
    };
  }

  private createVersionsTableMigration(timestamp: string): Migration {
    return {
      id: `mig_${timestamp}_create_versions`,
      name: "create_versions",
      up: `CREATE TABLE IF NOT EXISTS "${VERSIONS_TABLE}" (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  collection TEXT NOT NULL,\n  entryId TEXT NOT NULL,\n  version INTEGER NOT NULL,\n  data TEXT NOT NULL,\n  createdAt TEXT NOT NULL\n);`,
      down: `DROP TABLE IF EXISTS "${VERSIONS_TABLE}";`,
    };
  }

  private addColumnsMigration(
    collection: CollectionDefinition,
    newFields: FieldDefinition[],
    draftCols: string[],
    softDeleteCols: string[],
    scheduledPublishCols: string[],
    tableName: string,
    timestamp: string,
  ): Migration {
    const upLines = newFields.map(
      (f) =>
        `ALTER TABLE "${tableName}" ADD COLUMN ${fieldColumnName(f.name)} ${sqlTypeForField(f)};`,
    );
    for (const col of draftCols) {
      const def = col === "_status" ? "TEXT DEFAULT 'draft'" : "TEXT";
      upLines.push(`ALTER TABLE "${tableName}" ADD COLUMN ${col} ${def};`);
    }
    for (const col of softDeleteCols) {
      upLines.push(`ALTER TABLE "${tableName}" ADD COLUMN ${col} TEXT;`);
    }
    for (const col of scheduledPublishCols) {
      upLines.push(`ALTER TABLE "${tableName}" ADD COLUMN ${col} TEXT;`);
    }
    const downLines = [
      ...newFields.map(
        (f) => `-- WARNING: Cannot automatically revert ADD COLUMN for ${fieldColumnName(f.name)}`,
      ),
      ...draftCols.map((col) => `-- WARNING: Cannot automatically revert ADD COLUMN for ${col}`),
      ...softDeleteCols.map(
        (col) => `-- WARNING: Cannot automatically revert ADD COLUMN for ${col}`,
      ),
      ...scheduledPublishCols.map(
        (col) => `-- WARNING: Cannot automatically revert ADD COLUMN for ${col}`,
      ),
    ];

    return {
      id: `mig_${timestamp}_add_fields_${collection.slug}`,
      name: `add_fields_${collection.slug}`,
      up: upLines.join("\n"),
      down: downLines.join("\n"),
    };
  }
}
