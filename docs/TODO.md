# TODO — Arche CMS

> Project status: Milestone 9 complete. All 20 test packages pass (zero failures). Fixed pre-existing test failures: API mock adapter conflated internal tables (version history entries leaked into posts map); schema watcher tests made robust via polling instead of fixed delays. Publish workflow configured (with `workflow_dispatch`, provenance, GitHub Releases). Pending `NPM_TOKEN` secret + `@arche-cms` npm org setup.

---

## Milestone 1: Foundation (Weeks 1–3)

### Monorepo Setup

- [x] Initialize Turborepo with pnpm workspaces
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
- [x] Write tests for GraphQL schema and resolvers (31 tests: SDL, resolvers, relation resolution)

### Validation Generation (`packages/validation`)

- [x] Auto-generate Zod schemas from field definitions (all 30 field types mapped)
- [x] Support custom validation rules (min, max, minLength, maxLength, pattern, required)
- [x] Generate create and update schema variants
- [x] Write tests for generated validation (24 tests)

### Fastify API Server (`packages/cms/api`)

- [x] Scaffold Fastify server with plugin architecture (app factory with DI-style opts)
- [x] Register REST routes (wired from schema defs)
- [x] Register GraphQL routes (via Mercurius adapter with SDL + resolvers from `@arche-cms/graphql`)
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

### Admin App Scaffold (`packages/cms/admin`)

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

### CLI Package (`packages/cms`)

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

- [x] Design plugin API (hooks, events, extensions)
- [x] Implement plugin registry (PluginManager with register/unregister/enable/disable)
- [x] Implement plugin loader (auto-discover from `node_modules`)
- [x] Implement hook system (beforeSchemaLoad, afterSchemaLoad, beforeRouteRegister, afterRouteRegister, beforeRequest, afterRequest)
- [x] Implement extension points (custom fields via `getCustomFields()`, custom admin panels via `getAdminPanels()`, custom routes via `runRouteHook()`)
- [x] Wire PluginManager hooks into SchemaLoader (onBeforeLoad/onAfterLoad callbacks)
- [x] Wire PluginManager hooks into API app (beforeRouteRegister/afterRouteRegister)
- [x] Integrate plugin system into server entry point (packages/cms/api/src/index.ts)
- [x] Write plugin developer documentation

### Official Plugins

- [x] SEO plugin (meta fields, sitemap generation)
- [x] Audit Log plugin (track all mutations)
- [x] Webhooks plugin (trigger HTTP calls on events)
- [x] Search plugin (full-text search integration)
- [x] Comments plugin (basic comment fields with moderation)
- [x] Analytics plugin (basic page view tracking dashboard)

### Storage Package (`packages/storage`)

- [x] Define `StorageAdapter` interface (save, delete, getStream, exists)
- [x] Implement local filesystem adapter
- [x] Implement S3-compatible adapter
- [x] Implement Cloudflare R2 adapter
- [x] Write tests for storage adapters (14 tests)

---

## Milestone 8: Polish & Launch (Weeks 21–24)

### Documentation

- [x] Write README for core, schema, database, plugins, types, storage, auth, permissions, validation, rest-api, graphql, generators, cli, admin-ui, sdk
- [x] Write plugin development guide
- [x] Write CLI usage guide
- [x] Write architecture notes
- [x] Write API documentation (REST + GraphQL)
- [x] Write deployment guide
- [x] Write contributing guide
- [x] Set up documentation site (`apps/docs` with VitePress)

### Quality

- [x] Add error boundaries and error pages in admin UI
- [x] Create typed error classes (AppError, NotFoundError, ValidationError, ConflictError, AuthError, ForbiddenError)
- [x] Handle Fastify built-in errors (413 payload too large, 400 malformed JSON)
- [x] Handle unique constraint violations (409 Conflict)
- [x] Validate query parameters (limit, offset, sort) with 400 errors
- [x] Add auth to GraphQL endpoint
- [x] Add auth to media file serving
- [x] Add input validation to auth routes (email format, password length)
- [x] Handle edge cases (empty collections, deleted relations, etc.)
- [x] Add comprehensive error messages
- [x] Performance audit and optimization
- [x] Security audit
- [x] Accessibility audit
- [x] Test coverage to 80%+ (~420 tests, all packages covered)

### Content Workflow

- [x] Draft / publish workflow
- [x] Scheduled publishing
- [x] Soft delete
- [x] Version history and revisions
- [x] Localization / i18n

### Setup & Onboarding

- [x] Add onboarding form to register initial admin user
- [x] Check if database is working on startup and return error

### DevOps

- [x] Add Docker setup to run API locally
- [x] Add CI/CD to build docs site (`apps/docs`) and deploy build output to `docs/` folder

### Release

- [x] Configure npm package publishing for all packages
- [x] Set up CHANGELOG generation
- [x] Create v0.1.0 release (changeset)

---

## Milestone 9: Standalone CMS App (Next)

### Objective

Make `cms dev` work like Strapi — a single command that starts a full CMS server (REST + GraphQL + admin panel) with zero configuration. The package `@arche-cms/cms` exposes a `cms` binary so it works via:

```bash
npm install -g @arche-cms/cms     # global install → `cms dev`
npm install @arche-cms/cms         # local dep → `pnpm cms dev` / `npx cms dev`
npx @arche-cms/cms dev             # one-off, no install
```

Currently the API server lives in `packages/cms/api` and the CLI is a schema watcher that doesn't start an HTTP server.

### CLI Server Integration (`packages/cms`)

- [x] Move server bootstrap code from `packages/cms/api/src/index.ts` into `packages/cms/src/commands/dev.ts`
- [x] Support flags: `--port`, `--host`, `--schema-dir`, `--db-url`, `--db-adapter`
- [x] Auto-detect and create SQLite database file on first run (`cms.db`)
- [x] Add all server dependencies to CLI package.json
- [x] Copy all API server code (plugins, routes, services) into `packages/cms/src/server/`
- [x] Extract shared bootstrap logic into `packages/cms/src/server/bootstrap.ts`
- [x] Wire schema watcher into server hot-reload (debounced close + re-create Fastify)
- [x] Add `cms start` command for production (no file watching, no hot-reload)
- [x] Auto-migrate on startup: `getExistingSchema` added to DatabaseAdapter interface and implemented in SQLite + Postgres adapters; `connectAndLoad` now generates and runs pending migrations
- [ ] **Verify `cms dev` starts REST + GraphQL APIs in standalone app** — scaffold a project with `npx @arche-cms/create-app`, run `cd <project> && pnpm install && pnpm dev`, then test `GET /api/posts`, `POST /api/posts`, GraphQL at `/graphql`, Swagger at `/docs` (blocked: needs v0.1.2 published with fixed workspace:* deps)
- [ ] **Verify `cms dev` serves admin panel** — check that `http://localhost:3000` renders the admin login page (blocked: needs v0.1.2 published with bundled admin)

### Admin Panel Bundling (`packages/cms/admin`)

- [x] Make the admin panel build to a static directory that the API server serves
- [x] Configure Vite build output — production mode uses relative API URLs
- [x] Serve static admin panel from Fastify with SPA `index.html` fallback via `@fastify/static`
- [x] Add environment-aware admin URL: dev uses Vite dev server (port 5173), production uses bundled static
- [x] Auto-build admin panel as part of `cms build` pipeline before server build
- [x] **Bundle admin panel build with published `@arche-cms/cms` package** — Vite builds to `packages/cms/admin/dist/`; `"files": ["admin"]` in `packages/cms/package.json` includes it in the published package; `registerAdminStatic` resolves from `import.meta.url` to find the dist
- [x] **Serve admin panel in `cms dev`** — added `ensureAdminBuild()` check: if bundled admin dist is missing and monorepo `packages/cms/admin/` exists, auto-builds it with `pnpm --filter @arche-cms/admin build` and serves from `admin/dist/`

### Package Restructuring

- [x] Rename `@arche-cms/cli` → `@arche-cms/cms` as the main package
- [x] Rename directory `packages/cli/` → `packages/cms/`
- [x] Update all workspace references, docs, changesets, lockfile
- [x] Rename npm scope `@altrugenix/*` → `@arche-cms/*` across entire monorepo (560+ occurrences)
- [x] Verify `packages/cms/bin/cms.js` entry point with proper shebang
- [x] Verify pack tarball: 42KB, includes `dist/` + `bin/cms.js` + `package.json` with resolved workspace versions
- [x] Bump all packages to v0.1.0 via changeset
- [x] Fix bin field format in cms (object form required for scoped packages)
- [x] Create publish workflow (`.github/workflows/publish.yml` with changesets/action)
- [x] Add `workflow_dispatch` trigger for manual publishing
- [x] Enable npm provenance (`NPM_CONFIG_PROVENANCE`) and GitHub Release creation
- [ ] **Manual:** Set `NPM_TOKEN` as a GitHub Actions secret in repo settings
- [ ] **Manual:** Ensure `@arche-cms` org exists on npm with publish-capable token
- [x] **Create changeset (`fix-workspace-deps.md`)** — bumps 11 affected packages to 0.1.2; ready to push, merge, and publish
- [ ] **Manual:** Push to `main`, the auto-generated Version Packages PR will appear (requires "Allow GitHub Actions to create PRs" enabled), merge it, and publishing happens automatically

### Scaffolding (`@arche-cms/create-app`)

- [x] Create `packages/create-app/` with `@arche-cms/create-app` CLI
- [x] Prompt for project name, database choice, default locale
- [x] Scaffold example project with `cms/collections/`, `cms/globals/`, `.env`, config
- [x] Add `"dev": "cms dev"`, `"build": "cms build"`, `"start": "cms start"` scripts
- [x] Fix bin field format (unscoped package — string form is fine)
- [x] Create publish workflow (same publish.yml handles all packages including this one)

### Production Build (`cms build`)

- [x] Build admin panel + server code in one command
- [x] Support `--out-dir` flag with full production bundle assembly (copies admin build + server dist + generates package.json/Dockerfile)
- [x] Generate `package.json`, `Dockerfile`, and `.dockerignore` in output
- [x] **Include admin build in production bundle** — `cms build` now copies admin build to `packages/cms/admin/` as part of the build pipeline; `cms build --out-dir` includes admin files in the output bundle; Dockerfile updated to Node 24 + pnpm

### Documentation

- [x] Update root README with `npx @arche-cms/cms dev` quick start
- [x] Write "Usage as a Standalone App" guide in `docs/standalone-usage.md`
- [x] Update scaffold template to use pnpm
- [ ] **Update standalone-usage.md** — document that `cms dev` starts a full server with REST + GraphQL APIs at `localhost:3000`, admin panel at `localhost:3000`, and Swagger at `/docs`; include a "What you get" section showing the default posts collection API endpoints
- [ ] Create v0.2.0 release (after npm publish via GitHub Actions — tag + GitHub Release)

---

## Milestone 10: Admin UI Bug Fixes & Feature Gaps

### Status

`cms dev` verified working end-to-end via Playwright:

- Registration (POST `/api/auth/register` → 201, auto-login)
- Dashboard loads stats (collections, entries, media, users — all API calls return 200)
- Collections page lists "Posts" with 4 fields
- Globals page lists "Site Settings" with 6 fields
- Zero console errors. The root cause was a **stale admin build** — the `VITE_API_URL` was previously hardcoded to `http://localhost:3000` instead of `""` (same-origin), or the admin dist was not rebuilt after API route changes. Rebuilding the admin (`pnpm build:admin`) produces `const Xs=""` and `const jo=""` in the compiled JS, making all API calls use relative URLs — which works correctly when served from the same Fastify server.

### Critical — Data Not Loading in Admin UI

- [x] **Diagnose loading spinner freeze** — verified in Playwright: auth flow works, all API calls succeed (200), zero console errors. Root cause was stale admin build — fixed by rebuilding admin with `VITE_API_URL=""`.
- [x] **Fix loading issue** — resolved by the admin rebuild in Milestone 9 bundling work.

### Medium — Missing UI Elements

- [x] **Add "Create User" button + `/users/new` route** — added `routes/users/new.tsx` with email + password form, `createUser()` in `api.ts` (calls `POST /api/auth/register` with admin token), registered route in `router.tsx`, and "Add User" button in users list header.
- [x] **Add "Create Collection" button on `/collections`** — added link to `/schemas/new` (Schema Builder) with "Create Collection" button in collections list header.

### Medium — Settings Page Defaults

- [x] **Settings page works with existing `site-settings` global** — test-cms already has `cms/globals/site-settings.ts`. The scaffold template (`@arche-cms/create-app`) generates a `site-settings` global by default. If missing, the informative error message "Settings global not found. Create cms/globals/site-settings.ts" is shown.

### Low — Tech Debt

- [x] **Fix hardcoded locale list** — 3 files (`collections/$slug.tsx`, `new.$slug.tsx`, `$id_.$slug.edit.tsx`) now read from `collection.localization?.locales ?? ["en"]` instead of hardcoding EN/FR/DE/ES/JA/ZH.
- [x] **Add password change field to Edit User** — `auth/src/service.ts:updateUser()` now accepts and hashes `password`; `routes/users/$id.tsx` shows "New Password" input (blank = keep current); `api.ts:updateUser()` accepts `password`; `cms/src/server/routes/users.ts` passes `password` through.
- [x] **Coerce types in Settings/Global editors** — `settings/index.tsx` and `globals/$slug.tsx` changed from `Record<string, string>` to `Record<string, unknown>`; initial values preserve original types instead of coercing via `String()`; required validation checks `""`/`null` instead of falsy (to allow `false`/`0`).
- [x] **Fix unused `schema` state in Schema Editor** — removed unused `useState<SchemaInfo | null>(null)` from `schemas/$type.$slug.tsx`.
- [x] **Silent error swallowing on Dashboard** — `routes/index.tsx` now captures errors into `dashboardError` state and renders a `bg-destructive/10` banner when set.
- [x] **Add cancelled flag to Create Entry effect** — `new.$slug.tsx` now uses `let cancelled = false` guard pattern consistent with other routes.
- [x] **Redundant API calls** — added `DataProvider` (React Context) at `lib/data.tsx` that fetches collections/globals once. `useCollections()`, `useGlobals()`, `useCollection(slug)`, `useGlobal(slug)` hooks shared by Sidebar, CommandPalette, Dashboard, and all collection/global/settings pages. Single fetch replaces N+1 per navigation.
