# Changelog

## v0.2.0

### Features

- **Typed TypeScript SDK** — `@arche-cms/sdk` with `createClient()`, typed collection/global/auth/media/users/roles clients
- **API Tokens** — long-lived, revocable API tokens with SHA-256 hashing (`/settings/api-tokens`)
- **Webhooks** — CRUD management UI with HMAC-SHA256 signing, retry with exponential backoff (`/settings/webhooks`)
- **Plugins Listing** — read-only plugin management page (`/settings/plugins`)
- **Settings Page** — layout with sub-navigation for API tokens, plugins, webhooks, users, roles
- **TanStack Query** — migrated all admin UI data fetching from manual `useEffect` to `useQuery`/`useMutation`
- **Pagination** — server-side pagination on collections, media, users, roles, API tokens, webhooks
- **404 Page** — catch-all route for unknown paths
- **Forgot/Reset Password** — complete flow with token-based password reset
- **`cms start`** — production server command (no file watching, no hot-reload)
- **`--vite` flag** — Vite dev server with HMR for admin panel in development
- **CI Quality Gates** — knip, build check, bundle size check, fallow audit, gitleaks, npm audit
- **Pre-commit Hooks** — commitlint, knip, fallow audit, lint-staged

### Improved

- **Admin UI** — settings sub-routes, API token management, webhook management, pagination on all list views
- **Server** — activity/webhook coverage for all mutation types, graceful shutdown, webhook delivery status tracking
- **Security** — API key auth fallback, file size validation, security headers, permission checks on all routes
- **Field Types** — 29 field types with complete admin form renderers, schema builder settings, and validation

### Fixed

- Auth `updateUser` password storage key (was using wrong DB column)
- Global upsert webhook event name (`collection:updated` → `global:updated`)
- Unique constraint error handling for PostgreSQL
- GraphQL resolver adapter API (positional args)
- Generated migration adapter method (`executeSql` → `raw`)
- Field name regex (now allows underscores)
- `defineCollection` timestamp override (merges instead of overwriting)

## v0.1.0 (Initial Release)

Initial release of Arche CMS.

### Features

- File-based schema definition with 29 field types
- Auto-generated REST API with OpenAPI/Swagger
- Auto-generated GraphQL API with GraphiQL
- Zod validation schemas auto-generated from field definitions
- Plugin system with hooks, events, and extension points
- 6 official plugins: SEO, Audit Log, Webhooks, Search, Comments, Analytics
- SQLite and PostgreSQL database support
- JWT authentication with access/refresh tokens
- Role-based access control with field-level permissions
- Local, S3, and Cloudflare R2 storage adapters
- Admin UI with drag-and-drop schema builder
- Code generation pipeline (types, routes, validation, migrations)
- CLI tools for development and production
- `@arche-cms/create-app` scaffolding with Dockerfile generation
