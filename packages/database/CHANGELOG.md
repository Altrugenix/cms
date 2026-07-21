# @arche-cms/database

## 0.1.8

### Patch Changes

- 441acfc: fix(schema): export field helpers without aliases for backwards compatibility
- Updated dependencies [441acfc]
  - @arche-cms/types@0.1.8

## 0.1.7

### Patch Changes

- 14d6c25: v0.1.7
- Updated dependencies [14d6c25]
  - @arche-cms/types@0.1.7

## 0.1.3

### Patch Changes

- fix(database): lazy-load PostgresAdapter so pg is only imported when using postgres
  feat(cms): bundle admin panel build inside published package, add optional pg peer dep

## 0.1.2

### Patch Changes

- fix: replace workspace:* with published version ranges in all dependencies

## 0.1.1

### Patch Changes

- 3be2207: fix: replace workspace:* with version ranges for npm compatibility

## 0.1.0

### Minor Changes

- da9f85d: Initial v0.1.0 release of Arche CMS

  - File-based schema definition with 30 field types
  - Auto-generated REST API, GraphQL API, and TypeScript SDK
  - Plugin system with hooks, extension points, and auto-discovery
  - SQLite and PostgreSQL database support
  - JWT authentication with role-based access control
  - Local, S3, and Cloudflare R2 storage adapters
  - Admin UI with drag-and-drop schema builder
  - Code generation pipeline (types, routes, validation, migrations)
  - CLI tools for development and production

### Patch Changes

- Updated dependencies [da9f85d]
  - @arche-cms/types@0.1.0
