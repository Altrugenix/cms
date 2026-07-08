# TODO — Altrugenix CMS

> Project status: Foundation complete — Milestone 2 in progress

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
- [x] Write tests for all field types (38 tests)
- [x] Write tests for schema validation

### Shared Types (`packages/types`)

- [x] Define core TypeScript interfaces for fields, collections, globals
- [x] Define plugin API types
- [x] Define event types / core types (Logger, Config, CMSContext, Lifecycle)

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
- [ ] Write tests for migration generation

---

## Milestone 3: API Layer (Weeks 7–9)

### REST API Generator (`packages/rest-api`)

- [ ] Generate CRUD routes from schema definitions
- [ ] Support filtering, sorting, pagination, and field selection
- [ ] Handle relation population (deep population)
- [ ] Generate OpenAPI spec
- [ ] Serve OpenAPI spec via Swagger UI
- [ ] Add middleware hooks (before/after handlers)
- [ ] Write tests for REST endpoints

### GraphQL Generator (`packages/graphql`)

- [ ] Generate GraphQL types from schema definitions
- [ ] Generate CRUD queries and mutations
- [ ] Support filtering, sorting, pagination
- [ ] Handle relation resolution
- [ ] Support subscriptions (future)
- [ ] Write tests for GraphQL schema and resolvers

### Validation Generation

- [ ] Auto-generate Zod schemas from field definitions
- [ ] Support custom validation rules
- [ ] Generate input types for mutations
- [ ] Write tests for generated validation

### Fastify API Server (`apps/api`)

- [ ] Scaffold Fastify server with plugin architecture
- [ ] Register REST and GraphQL routes
- [ ] Add CORS, security headers, rate limiting
- [ ] Add health check endpoint
- [ ] Add request logging
- [ ] Add error handling middleware

---

## Milestone 4: Auth & Permissions (Weeks 10–11)

### Auth Package (`packages/auth`)

- [ ] Implement JWT token generation (access + refresh)
- [ ] Implement login endpoint
- [ ] Implement register endpoint
- [ ] Implement forgot/reset password
- [ ] Implement token refresh
- [ ] Implement email verification (optional)
- [ ] Add session management
- [ ] Write tests for auth flows

### Permissions Package (`packages/permissions`)

- [ ] Define RBAC model (roles, permissions, resources)
- [ ] Implement permission checker middleware
- [ ] Support field-level permissions (read/write per field)
- [ ] Implement role CRUD
- [ ] Write tests for permission engine

### Admin Auth Flow

- [ ] Integrate auth with admin panel
- [ ] Build login/register pages
- [ ] Implement auth guard on admin routes
- [ ] Build forgot/reset password pages

---

## Milestone 5: Admin UI (Weeks 12–16)

### Admin App Scaffold (`apps/admin`)

- [ ] Scaffold Vite + React + TanStack Router + Tailwind v4 + shadcn/ui
- [ ] Set up dark mode with ThemeProvider
- [ ] Create layout (sidebar, header, content area)
- [ ] Implement command palette (⌘K)
- [ ] Add keyboard shortcut system

### Dashboard

- [ ] Build dashboard overview page
- [ ] Show collection stats (entry counts)
- [ ] Show recent activity feed
- [ ] Add quick-action buttons

### Collection Views

- [ ] Build collection list view (table with sorting, filtering, pagination)
- [ ] Build collection edit/create form (auto-generated from schema)
- [ ] Handle all field type inputs (text, number, rich text, media, relation, etc.)
- [ ] Implement relation picker (search + select from related collection)
- [ ] Implement media picker
- [ ] Show field validation errors inline
- [ ] Add bulk actions (delete, publish, unpublish)

### Global Views

- [ ] Build global edit view (auto-generated form)
- [ ] Handle singleton save behavior

### Media Library

- [ ] Build media library grid view
- [ ] Implement file upload (drag & drop + click)
- [ ] Implement file delete and rename
- [ ] Create folder organization
- [ ] Show file metadata (dimensions, size, type)

### User & Role Management

- [ ] Build user list and edit pages
- [ ] Build role management pages
- [ ] Integrate with permissions package

### Schema Builder

- [ ] Build drag-and-drop field editor
- [ ] Field settings panel (type, name, validation, help text)
- [ ] Field reordering
- [ ] Preview generated TypeScript schema
- [ ] Save schema to file

### Settings

- [ ] Build settings pages (general, SEO, media, etc.)

### Miscellaneous

- [ ] Implement responsive design
- [ ] Add loading states and skeletons
- [ ] Add error boundaries
- [ ] Add toast notifications
- [ ] Add confirmation dialogs for destructive actions

---

## Milestone 6: CLI & Code Generation (Weeks 17–18)

### CLI Package (`packages/cli`)

- [x] Scaffold CLI with `cms` binary
- [ ] Implement `cms dev` (start dev server with file watching)
- [ ] Implement `cms build` (build for production)
- [ ] Implement `cms generate` (run code generation)
- [ ] Implement `cms migrate` (run database migrations)
- [ ] Implement `cms typegen` (generate TypeScript types)
- [ ] Implement `cms lint` (lint schema definitions)
- [ ] Implement `cms doctor` (check project health)
- [x] Implement `cms collection create` (scaffold a collection)
- [x] Implement `cms plugin create` (scaffold a plugin)

### Generators Package (`packages/generators`)

- [x] Build TypeScript type generation pipeline
- [ ] Build API route generation pipeline
- [ ] Build Zod validation generation pipeline
- [ ] Build database migration generation pipeline
- [ ] Build GraphQL schema generation pipeline
- [ ] Build OpenAPI spec generation pipeline
- [ ] Build SDK generation pipeline
- [ ] Build admin form generation pipeline
- [ ] Write tests for each generator

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

- [ ] Define `StorageAdapter` interface
- [ ] Implement local filesystem adapter
- [ ] Implement S3-compatible adapter
- [ ] Implement Cloudflare R2 adapter
- [ ] Write tests for storage adapters

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

- [ ] Add error boundaries and error pages in admin UI
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
