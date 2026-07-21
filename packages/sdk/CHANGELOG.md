# @arche-cms/sdk

## 0.1.8

### Patch Changes

- 441acfc: fix(schema): export field helpers without aliases for backwards compatibility

## 0.1.7

### Patch Changes

- 14d6c25: v0.1.7

## 0.2.0

### Minor Changes

- Implement full typed SDK client:
  - `createClient()` factory with `baseUrl`, `token`, and custom `fetch` support
  - Typed collection client: `list`, `get`, `create`, `update`, `delete`, `bulkDelete`, `publish`, `unpublish`, `restore`, `versions`, `restoreVersion`
  - Typed global client: `get`, `upsert`
  - Auth client: `login`, `register`, `refresh`, `forgotPassword`, `resetPassword`, `me`, `setupStatus`
  - Media client: `list`, `get`, `upload`, `update`, `delete`, `getFile`, plus `folders` sub-client
  - Users client: `list`, `get`, `create`, `update`, `delete`
  - Roles client: `list`, `get`, `create`, `update`, `delete`
  - Activity client: `list` with filter params
  - Settings client: `apiTokens` (list, create, delete) and `webhooks` (list, get, create, update, delete)
  - `ApiError` class with `status`, `message`, `details`, and `code`
  - Request/response/error interceptors
  - 55 tests covering all clients, error handling, auth headers, and URL construction

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
