# @arche-cms/database

Database adapter layer for Arche CMS. Provides a unified interface over multiple database engines with migration support.

## Installation

```bash
yarn add @arche-cms/database
```

## Usage

### Connect

```ts
import { SQLiteAdapter } from "@arche-cms/database";

const adapter = new SQLiteAdapter("file:./cms.db");
await adapter.connect();
```

### CRUD Operations

```ts
// Create
const post = await adapter.create("posts", { title: "Hello", status: "draft" });

// Read
const post = await adapter.findOne("posts", "1");
const posts = await adapter.findMany("posts", {
  where: { status: "published" },
  limit: 10,
  offset: 0,
  sort: { createdAt: "desc" },
});

// Update
const updated = await adapter.update("posts", "1", { title: "Updated" });

// Delete
await adapter.delete("posts", "1");
```

### Migrations

Generate and run migrations from schema definitions:

```ts
import { generateMigration, runMigrations } from "@arche-cms/database";

const migration = generateMigration(schemas, existingTables);
await runMigrations(adapter, [migration]);
```

### Repository Pattern

Generic typed repository for CRUD operations:

```ts
import { Repository } from "@arche-cms/database";

const repo = new Repository(adapter, "posts");
const post = await repo.findById("1");
const all = await repo.findAll({ limit: 100 });
```

## Supported Databases

- SQLite (via `@libsql/client`)
- PostgreSQL (via `pg`)
