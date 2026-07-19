# CLI Usage Guide

The Arche CMS CLI provides commands for development, building, code generation, and schema management.

## Installation

```bash
# Via the monorepo
pnpm cms <command>

# Or globally
npm install -g @arche-cms/cms
cms <command>

# Or one-off via npx
npx @arche-cms/cms <command>
```

## Commands

### `cms dev`

Start the CMS development server with hot-reloading:

```bash
cms dev
```

| Flag                  | Description                                 | Default         |
| --------------------- | ------------------------------------------- | --------------- |
| `--dir <path>`        | Schema directory                            | `./cms`         |
| `--port <num>`        | Server port                                 | `3000`          |
| `--host <addr>`       | Server host                                 | `0.0.0.0`       |
| `--db-url <url>`      | Database URL                                | `file:./cms.db` |
| `--db-adapter <type>` | Database adapter                            | `sqlite`        |
| `--vite`              | Start Vite dev server for admin UI with HMR | `false`         |

Watches schema files for changes and automatically regenerates types and API routes.

### `cms start`

Start the CMS in production mode (no file watching, no hot-reload):

```bash
cms start
```

| Flag                  | Description      | Default         |
| --------------------- | ---------------- | --------------- |
| `--dir <path>`        | Schema directory | `./cms`         |
| `--port <num>`        | Server port      | `3000`          |
| `--host <addr>`       | Server host      | `0.0.0.0`       |
| `--db-url <url>`      | Database URL     | `file:./cms.db` |
| `--db-adapter <type>` | Database adapter | `sqlite`        |

### `cms build`

Build the CMS for production:

```bash
cms build
```

| Flag               | Description            | Default  |
| ------------------ | ---------------------- | -------- |
| `--clean`          | Clean output directory | `false`  |
| `--out-dir <path>` | Output directory       | `./dist` |

Compiles schemas, generates types, runs migrations, and builds the admin UI.

### `cms generate`

Run all code generators:

```bash
cms generate
```

| Flag           | Description      | Default  |
| -------------- | ---------------- | -------- |
| `--dir <path>` | Schema directory | `./cms`  |
| `--out <path>` | Output directory | `./dist` |

Generates TypeScript types, API routes, Zod validation schemas, database migrations, GraphQL schema, OpenAPI spec, and admin forms from your schema definitions.

### `cms typegen`

Generate TypeScript types from schema definitions only:

```bash
cms typegen
```

| Flag           | Description      | Default  |
| -------------- | ---------------- | -------- |
| `--dir <path>` | Schema directory | `./cms`  |
| `--out <path>` | Output directory | `./dist` |

### `cms migrate`

Print or run database migrations:

```bash
# Preview migrations
cms migrate

# Run migrations
cms migrate --run
```

| Flag           | Description        | Default |
| -------------- | ------------------ | ------- |
| `--dir <path>` | Schema directory   | `./cms` |
| `--db <path>`  | Database file path | —       |

### `cms lint`

Validate schema definitions:

```bash
cms lint
```

| Flag           | Description      | Default |
| -------------- | ---------------- | ------- |
| `--dir <path>` | Schema directory | `./cms` |
| `--fix`        | Auto-fix issues  | `false` |

Checks all collection, global, and component definitions for correctness.

### `cms doctor`

Check project health:

```bash
cms doctor
```

| Flag           | Description      | Default |
| -------------- | ---------------- | ------- |
| `--dir <path>` | Schema directory | `./cms` |

Verifies configuration, database connectivity, schema validity, and dependency versions.

### `cms collection create`

Scaffold a new collection:

```bash
cms collection create posts
```

| Flag           | Description      | Default |
| -------------- | ---------------- | ------- |
| `--dir <path>` | Schema directory | `./cms` |

Creates a new collection definition file with default fields.

### `cms plugin create`

Scaffold a new plugin:

```bash
cms plugin create my-plugin
```

| Flag           | Description      | Default |
| -------------- | ---------------- | ------- |
| `--dir <path>` | Schema directory | `./cms` |

Creates a new plugin skeleton with the correct structure and naming.
