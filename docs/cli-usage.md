# CLI Usage Guide

The Arche CMS CLI provides commands for development, building, code generation, and schema management.

## Installation

```bash
# Via the monorepo
yarn cms <command>

# Or globally
npm install -g @arche-cms/cms
cms <command>
```

## Commands

### `cms dev`

Start the CMS development server with hot-reloading:

```bash
cms dev
```

Watches schema files for changes and automatically regenerates types and API routes.

### `cms build`

Build the CMS for production:

```bash
cms build
```

Compiles schemas, generates types, runs migrations, and builds the admin UI.

### `cms generate`

Run all code generators:

```bash
cms generate
```

Generates TypeScript types, API routes, Zod validation schemas, database migrations, GraphQL schema, OpenAPI spec, and admin forms from your schema definitions.

### `cms typegen`

Generate TypeScript types from schema definitions only:

```bash
cms typegen
```

### `cms migrate`

Print or run database migrations:

```bash
# Preview migrations
cms migrate

# Run migrations
cms migrate --run
```

### `cms lint`

Validate schema definitions:

```bash
cms lint
```

Checks all collection, global, and component definitions for correctness.

### `cms doctor`

Check project health:

```bash
cms doctor
```

Verifies configuration, database connectivity, schema validity, and dependency versions.

### `cms collection create`

Scaffold a new collection:

```bash
cms collection create posts
```

Creates a new collection definition file with default fields.

### `cms plugin create`

Scaffold a new plugin:

```bash
cms plugin create my-plugin
```

Creates a new plugin skeleton with the correct structure and naming.
