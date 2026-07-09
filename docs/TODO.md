# TODO — Altrugenix CMS

> Project status: Milestone 6 in progress (code generation generators: pipeline architecture + API routes + Zod validation + DB migrations + GraphQL schema + OpenAPI spec + SDK + admin form generators). **287 tests** across all packages. Next: generators tests + plugin system (Milestone 7)

---

## Milestone 1: Foundation (Weeks 1–3)

### Monorepo Setup

- [x] Initialize Turborepo with Yarn workspaces
- [x] Configure TypeScript strict mode across all packages
- [x] Set up ESLint, Prettier, and lint-staged
- [x] Configure Vitest with coverage
- [x] Create package scaffolding script (CLI: `cms collection create` + `cms plugin create`)
- [x] Set up CI (GitHub Actions — lint, typecheck, test)

### Core Package (`packages/core`)

- [x] Implement DI container (typed, async-capable)
- [x] Implement event bus (typed, async, with middleware)
- [x] Define lifecycle hooks (init, ready, shutdown)
- [x] Create logger abstraction
- [x] Create config loader (env, files, defaults)

### Schema Package (`packages/schema`)

- [x] Design `defineCollection` API
- [x] Implement field type system (base types + extensions)
- [x] Build field helpers: `text()`, `textarea()`, `number()`, `boolean()`, `date()`, `email()`, `url()`, `json()`, `select()`, `relation()`, `media()`, `richText()`, `markdown()`, `code()`, `color()`, `slug()`, `password()`, etc.
- [x] Build component and global schema definitions
- [x] Implement schema validator
- [x] Implement schema loader (file discovery + parsing)
- [x] Add file watching for dev mode (HMR for schemas)
- [x] Generate TypeScript types from schema definitions
- [x] Write tests for all field types + validation (42 tests)

### Shared Types (`packages/types`)

- [x] Define core TypeScript interfaces for fields, collections, globals
- [x] Define plugin API types
- [x] Define event types / core types (Logger, Config, CMSContext, Lifecycle)
- [x] Write tests (1 test)

---

## Milestone 2: Data Layer (Weeks 4–6)

### Database Package (`packages/database`)

- [x] Define `DatabaseAdapter` interface (CRUD, transactions, migrations)
- [x] Implement SQLite adapter (via `@libsql/client`)
- [x] Implement PostgreSQL adapter (via `pg`)
- [x] Build migration generator (schema diff → migration files)
- [x] Build migration runner
- [x] Implement repository pattern (generic CRUD with typing)
- [x] Support query building (filtering, sorting, pagination)
- [x] Add connection pooling for PostgreSQL (via `pg.Pool` with configurable size)
- [x] Write tests for SQLite adapter (11 tests)
- [x] Write tests for PostgreSQL adapter (10 tests, conditional on `PG_TEST_URL`)
- [x] Write tests for migration generation (6 tests)

---

## Milestone 3: API Layer (Weeks 7–9)

### REST API Generator (`packages/rest-api`)

- [x] Generate CRUD routes from schema definitions (5 routes per collection: list/get/create/update/delete)
- [x] Support filtering, sorting, pagination, and field selection
- [x] Handle relation population (deep population)
- [x] Generate OpenAPI spec (3.1.0 with component schemas)
- [x] Serve OpenAPI spec via Swagger UI (via @fastify/swagger + @fastify/swagger-ui at /docs)
- [x] Add middleware hooks (before/after handlers with `applyMiddleware` wrapper)
- [x] Wire validation into create/update handlers (Zod request body validation with 400 error + details)
- [x] Write tests for REST endpoints (40 tests: route gen, handlers, OpenAPI, validation, middleware)

### GraphQL Generator (`packages/graphql`)

- [x] Generate GraphQL types from schema definitions (SDL with 30 field type mappings)
- [x] Generate CRUD queries and mutations (list/get/create/update/delete)
- [x] Support filtering, sorting, pagination (filter input, sort enum, limit/offset)
- [x] Handle relation resolution (type-level field resolvers via `findOne`/`findMany` on relation fields)
- [ ] Support subscriptions (future)
- [x] Write tests for GraphQL schema and resolvers (31 tests: SDL, resolvers, relation resolution)

### Validation Generation (`packages/validation`)

- [x] Auto-generate Zod schemas from field definitions (all 30 field types mapped)
- [x] Support custom validation rules (min, max, minLength, maxLength, pattern, required)
- [x] Generate create and update schema variants
- [x] Write tests for generated validation (24 tests)

### Fastify API Server (`apps/api`)

- [x] Scaffold Fastify server with plugin architecture (app factory with DI-style opts)
- [x] Register REST routes (wired from schema defs)
- [x] Register GraphQL routes (via Mercurius adapter with SDL + resolvers from `@altrugenix/graphql`)
- [x] Add GraphiQL support (`/graphiql`)
- [x] Write tests for GraphQL endpoint (6 tests: queries, mutations, GraphiQL)
- [x] Add CORS, security headers, rate limiting (via @fastify/cors + @fastify/rate-limit)
- [x] Add health check endpoint (GET /health)
- [x] Add request logging (onResponse hook)
- [x] Add error handling middleware (setErrorHandler with status-aware responses)
- [x] Serve Swagger UI (via @fastify/swagger + @fastify/swagger-ui at /docs)
- [x] Write tests for server (15 tests: health, Swagger, CRUD, 404, validation, GraphQL)

---

## Milestone 4: Auth & Permissions (Weeks 10–11)

### Auth Package (`packages/auth`)

- [x] Implement JWT token generation (access + refresh)
- [x] Implement login endpoint
- [x] Implement register endpoint
- [x] Implement forgot/reset password
- [x] Implement token refresh
- [ ] Implement email verification (optional)
- [x] Add session management (JWT-based, no server-side sessions)
- [x] Write tests for auth flows (19 tests: JWT, password, auth service)

### Permissions Package (`packages/permissions`)

- [x] Define RBAC model (roles, permissions, resources)
- [x] Implement permission checker middleware (Fastify preHandler)
- [x] Support field-level permissions (read/write per field with `filterFields`)
- [x] Implement role CRUD (create, read, update, delete roles)
- [x] Write tests for permission engine (18 tests: RBAC, CRUD, field filtering)

### Admin Auth Flow

- [x] Integrate auth with admin panel (AuthProvider + login/register pages)
- [x] Build login/register pages
- [x] Implement auth guard on admin routes
- [x] Build forgot/reset password pages

---

## Milestone 5: Admin UI (Weeks 12–16)

### Admin App Scaffold (`apps/admin`)

- [x] Scaffold Vite + React + TanStack Router + Tailwind v4 + shadcn/ui
- [x] Set up dark mode with ThemeProvider
- [x] Create layout (sidebar, header, content area)
- [x] Add login/register pages with auth integration
- [x] Implement command palette (⌘K)
- [x] Add keyboard shortcut system

### Dashboard

- [x] Build dashboard overview page
- [x] Show collection stats (entry counts)
- [x] Show recent activity feed
- [x] Add quick-action buttons

### Collection Views

- [x] Build collection list view (table with sorting, filtering, pagination)
- [x] Build collection edit/create form (auto-generated from schema)
- [x] Handle all field type inputs (text, number, textarea, select, boolean, slug, json, richText, etc.)
- [x] Implement relation picker (searchable select from related collection with auto-fetch)
- [x] Implement media picker (upload + preview in FieldInput for media/upload types)
- [x] Show field validation errors inline
- [x] Add bulk actions (delete via checkbox selection + confirmation dialog)

### Global Views

- [x] Build global edit view (auto-generated form)
- [x] Handle singleton save behavior (upsert: create first visit, update thereafter)

### Media Library

- [x] Build StorageAdapter interface (save, delete, getStream, exists)
- [x] Implement LocalStorageAdapter
- [x] Build media API routes (upload, list, get, delete, serve file)
- [x] Build media library grid view (upload button, image grid, delete)
- [x] Implement file upload (base64 via JSON API)
- [x] Show file metadata (size, type, preview)
- [x] Implement file rename / alt text editing
- [x] Create folder organization
- [x] Implement drag & drop upload

### User & Role Management

- [x] Build user list and edit pages
- [x] Build role management pages (list, create, edit)
- [x] Integrate with permissions package (exposed API routes for roles + users)

### Schema Builder

- [x] Build drag-and-drop field editor
- [x] Field settings panel (type, name, validation, help text)
- [x] Field reordering
- [x] Preview generated TypeScript schema
- [x] Save schema to file

### Settings

- [x] Build settings page (site name, description, admin email, locale, SEO defaults)

### Miscellaneous

- [x] Implement responsive design
- [x] Add loading states and skeletons
- [x] Add error boundaries
- [x] Add toast notifications
- [x] Add confirmation dialogs for destructive actions

---

## Milestone 6: CLI & Code Generation (Weeks 17–18)

### CLI Package (`packages/cli`)

- [x] Scaffold CLI with `cms` binary
- [x] Implement `cms dev` (start dev server with file watching)
- [x] Implement `cms build` (build for production)
- [x] Implement `cms generate` (run code generation)
- [x] Implement `cms migrate` (print migration plan from schemas)
- [x] Implement `cms typegen` (generate TypeScript types)
- [x] Implement `cms lint` (validate schema definitions)
- [x] Implement `cms doctor` (check project health)
- [x] Implement `cms collection create` (scaffold a collection)
- [x] Implement `cms plugin create` (scaffold a plugin)

### Generators Package (`packages/generators`)

- [x] Build TypeScript type generation pipeline
- [x] Build API route generation pipeline
- [x] Build Zod validation generation pipeline
- [x] Build database migration generation pipeline
- [x] Build GraphQL schema generation pipeline
- [x] Build OpenAPI spec generation pipeline
- [x] Build SDK generation pipeline
- [x] Build admin form generation pipeline
- [x] Write tests for each generator

---

## Milestone 7: Plugin System (Weeks 19–20)

### Plugin Infrastructure

- [ ] Design plugin API (hooks, events, extensions)
- [ ] Implement plugin registry
- [ ] Implement plugin loader (auto-discover from `node_modules`)
- [ ] Implement hook system (before/after lifecycle hooks)
- [ ] Implement extension points (custom fields, custom routes, custom admin panels)
- [ ] Write plugin developer documentation

### Official Plugins

- [ ] SEO plugin (meta fields, sitemap generation)
- [ ] Audit Log plugin (track all mutations)
- [ ] Webhooks plugin (trigger HTTP calls on events)
- [ ] Search plugin (full-text search integration)
- [ ] Comments plugin
- [ ] Analytics plugin (basic page view tracking)

### Storage Package (`packages/storage`)

- [x] Define `StorageAdapter` interface (save, delete, getStream, exists)
- [x] Implement local filesystem adapter
- [ ] Implement S3-compatible adapter
- [ ] Implement Cloudflare R2 adapter
- [x] Write tests for storage adapters (7 tests)

---

## Milestone 8: Polish & Launch (Weeks 21–24)

### Documentation

- [ ] Write README for every package
- [ ] Write architecture notes
- [ ] Write API documentation (REST + GraphQL)
- [ ] Write plugin development guide
- [ ] Write CLI usage guide
- [ ] Write deployment guide
- [ ] Write contributing guide
- [ ] Set up documentation site (`apps/docs`)

### Quality

- [x] Add error boundaries and error pages in admin UI
- [ ] Handle edge cases (empty collections, deleted relations, etc.)
- [ ] Add comprehensive error messages
- [ ] Performance audit and optimization
- [ ] Security audit
- [ ] Accessibility audit
- [ ] Test coverage to 80%+

### Release

- [ ] Configure npm package publishing for all packages
- [ ] Set up CHANGELOG generation
- [ ] Create v0.1.0 release
- [ ] Write launch blog post
- [ ] Set up community channels (Discord, GitHub Discussions)

---

## Backlog (Future Milestones)

- [ ] Draft / publish workflow
- [ ] Version history and revisions
- [ ] Autosave
- [ ] Scheduled publishing
- [ ] Localization / i18n
- [ ] Soft delete
- [ ] Visual page builder
- [ ] Form builder
- [ ] Workflow automation
- [ ] Realtime collaboration
- [ ] Multi-tenancy
- [ ] Plugin marketplace
- [ ] AI content generation
- [ ] Live preview SDK
