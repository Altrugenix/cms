# TODO — Arche CMS

> Project status: M30 complete — v0.3.0 released. M31 complete — 15 coverage gap tests. M32 complete — Version history UI, bulk publish/unpublish, media folder rename. M33 complete — SDK code generation integration with typed imports and pipeline. 1,400+ tests passing across all 17 packages. CMS 95.71% line coverage. M34 complete — 90 playground E2E tests covering all API endpoints. M36 complete — Firebase-backed CMS MVP variant (new `packages/cms-firebase/` package). 1,929+ tests passing. M37 complete — Extract admin UI into `@arche-cms/admin-ui` package.

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

### Admin App Scaffold (`packages/admin-ui`)

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
- [x] **Verify `cms dev` starts REST + GraphQL APIs in standalone app** — confirmed via Playwright (Milestone 10): registration, dashboard stats, collections, globals all return 200. All API routes functional.
- [x] **Verify `cms dev` serves admin panel** — confirmed via Playwright: admin login page renders at `http://localhost:3000`, zero console errors.

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
- [x] **Manual:** Set `NPM_TOKEN` as a GitHub Actions secret in repo settings
- [x] **Manual:** Ensure `@arche-cms` org exists on npm with publish-capable token
- [x] **Create changeset (`fix-workspace-deps.md`)** — bumps 11 affected packages to 0.1.2; ready to push, merge, and publish
- [x] **Manual:** Push to `main`, the auto-generated Version Packages PR will appear (requires "Allow GitHub Actions to create PRs" enabled), merge it, and publishing happens automatically

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
- [x] **Update standalone-usage.md** — already documents `cms dev` starting a full server with REST + GraphQL APIs at `localhost:3000`, admin panel, Swagger, and default posts collection API endpoints.
- [x] Create v0.2.0 release (after npm publish via GitHub Actions — tag + GitHub Release)

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

---

## Milestone 11: Test Coverage Expansion

### Status

Current baseline: ~379 real test cases across 16 packages. Key gaps in validation coverage, schema loader, plugin discovery, CMS server routes/plugins, storage adapters, and scaffolding CLI.

### Validation Package (`packages/validation`)

- [x] **Field type coverage** — 12 new tests for: `password`, `media`, `upload`, `radio` (with options), `select` (without options), `array`/`repeater`/`object`/`group` (without and with sub-fields), `tabs` (with/without tabs), unknown default type
- [x] **Localization** — 3 tests covering `fieldToZodSchema(field, true)` with localized field, non-localized field, and `localize=false` with localized field
- [x] **Custom validation function** — 1 test for `validation.custom` applied as `refine()`
- [x] **Pattern validation on email/url** — 2 tests for regex pattern on email and url types
- [x] **Combined validators** — 1 test for concurrent minLength + maxLength + pattern
- [x] **Create schema extras** — 3 tests for `_status` with drafts, `_publishAt` with scheduledPublishing, both together
- [x] **Update schema extras** — 2 tests for `_status` and `_publishAt` in update variant
- [x] **Custom validation message** — 5 tests covering custom messages for minLength, maxLength, min, max, pattern

---

## Milestone 12: Server Route Completeness & Tech Debt

### Overview

Reviewed all 22 server-side files for route completeness, comparing `packages/cms/src/server/routes/` (6 files), `plugins/` (10 files), `lib/` (2 files), services/ (1 file), bootstrap/config/app (3 files) with the admin API client (`admin/lib/api.ts`). All routes are registered and functional.

### Completed (Milestone 12)

- [x] **POST /api/users route** — Added to `routes/users.ts:22` with `requirePermission("create", "users")` guard. Uses `authService.register(body)` — same logic as `/api/auth/register` but without the setup-guard check.
- [x] **createUser calls POST /api/users** — `admin/lib/api.ts:263` now calls `POST /api/users` via `apiFetch()` instead of `POST /api/auth/register`.
- [x] **bulkDelete in admin api.ts** — Added `bulkDelete(path, ids)` function at `admin/lib/api.ts:70`. Uses `POST /api/:path/bulk-delete`.
- [x] **Configurable activity table name** — `activity.ts:12` now reads `process.env.CMS_ACTIVITY_TABLE` with fallback to `__cms_activity`. Exported as `ACTIVITY_TABLE`.

### Verified — No Action Needed

- **GET /api/media/file/:id** — Already wired at `media.ts:188`. The route was always registered.
- **Content-Type ordering in serveFile** — Already correct: `reply.type(typed.mimeType)` at line 202, `reply.send(stream)` at line 205. Type is set before send.
- **No unused route functions** — All exported functions in route files are registered on Fastify or used within the file.
- **Role ID handling** — `roles.ts` uses consistent string-based IDs throughout. The `toString()` reference was from an older version.

### Deferred

- **Version history / localization in admin API client** — Server routes exist (`/api/:path/:id/versions`, `/api/:path/:id/versions/:versionId/restore`, and localized variants) but the admin UI lacks UI for versions and localized content. Will be addressed in a future milestone.

---

## Milestone 13: Settings Page Refactor

### Objective

Rewrite `/settings` from a schema-driven global page (`site-settings`) into a static app settings page with sub-sections for API tokens, plugins, webhooks, roles, and users. The `site-settings` global remains as a normal global in the Globals section — settings no longer depends on it.

### Approach

The Settings page becomes a layout route with a sub-navigation (tabs or side-nav) that hosts multiple sub-pages. Currently standalone routes (`/users`, `/roles`) are relocated under `/settings/` with redirects from the old paths.

### Route Structure (final)

```
/settings                   → Settings layout (tabs/side-nav)
/settings/api-tokens        → API token management (NEW)
/settings/plugins           → Plugin listing (NEW)
/settings/webhooks          → Webhook management (NEW)
/settings/roles             → Role management (relocated from /roles)
/settings/users             → User management (relocated from /users)
```

### Phase 1: Settings Layout & Sub-routing

- [x] Rewrite `routes/settings/index.tsx` — remove dependency on `site-settings` global (no `useGlobals`, `fetchGlobal`, `saveGlobal`). Converted to a layout component with vertical side-nav inside the page, rendering child routes via `<Outlet />`.
- [x] Update `router.tsx` — register settings sub-routes using `createRoute({ getParentRoute: () => settingsRoute, ... })`. 11 sub-routes added: api-tokens, plugins, webhooks, users (index/new/$id), roles (index/new/$id).

### Phase 2: Relocate Users & Roles

- [x] Move `routes/users/index.tsx` → `routes/settings/users/index.tsx`, update path to `/settings/users`.
- [x] Move `routes/users/new.tsx` → `routes/settings/users/new.tsx`, update path.
- [x] Move `routes/users/$id.tsx` → `routes/settings/users/$id.tsx`, update path.
- [x] Move `routes/roles/index.tsx` → `routes/settings/roles/index.tsx`, update path to `/settings/roles`.
- [x] Move `routes/roles/new.tsx` → `routes/settings/roles/new.tsx`, update path.
- [x] Move `routes/roles/$id.tsx` → `routes/settings/roles/$id.tsx`, update path.
- [x] Update all internal links in moved routes (e.g., "Add User" button → `/settings/users/new`, edit links → `/settings/users/$id`, etc.).
- [x] Add redirect routes at old `/users` and `/roles` paths (TanStack Router `beforeLoad` redirect to new paths). Old route files converted to redirects (not removed).

### Phase 3: API Tokens

- [x] Create `__cms_api_tokens` table — columns: `name`, `token_hash` (UNIQUE), `last_four`, `description`, `created_at`, `created_by`, `last_used_at`. Table created via `adapter.createTable()` in `packages/cms/src/server/routes/api-tokens.ts`.
- [x] Add server routes:
  - `GET /api/settings/api-tokens` — list tokens (never expose `token_hash`).
  - `POST /api/settings/api-tokens` — create token (return raw token once in response).
  - `DELETE /api/settings/api-tokens/:id` — revoke token with permission check.
- [x] Token creation: generate `cms_<randomBytes(32).hex>` (67 chars), hash with SHA-256 (`node:crypto`), store hash + last 4 chars in DB.
- [x] API key auth middleware — `authenticate` decorator in `plugins/auth.ts` now falls back to SHA-256 lookup in `__cms_api_tokens` when JWT verification fails. Sets `request.user = { sub, email: token.name, role: "admin" }`, updates `last_used_at`.
- [x] Admin API client functions: `fetchApiTokens()`, `createApiToken(data)`, `deleteApiToken(id)` in `admin/lib/api.ts`.
- [x] Admin UI at `routes/settings/api-tokens.tsx`: list table (name, last-four, created, last-used), inline create form, one-time token display with copy button, revoke with confirmation dialog.

### Phase 4: Webhooks

- [x] Create `__cms_webhooks` table — columns: `name`, `url`, `events` (JSON string), `collection` (default `*`), `enabled`, `secret`, `created_at`, `updated_at`.
- [x] Server routes at `packages/cms/src/server/routes/webhooks.ts`:
  - `GET /api/settings/webhooks` — list webhooks.
  - `GET /api/settings/webhooks/:id` — get single webhook.
  - `POST /api/settings/webhooks` — create webhook.
  - `PUT /api/settings/webhooks/:id` — update webhook (partial).
  - `DELETE /api/settings/webhooks/:id` — delete webhook.
- [x] Event dispatching in `packages/cms/src/server/lib/webhooks.ts`: `dispatchWebhooks()` queries enabled webhooks matching event + collection, fires `POST` with JSON payload + optional HMAC-SHA256 `X-Webhook-Signature` header (10s timeout, fire-and-forget).
- [x] Webhook dispatch wired into `wrapWithActivity()` in `collections.ts` — fires on every collection CRUD mutation (`collection:created`, `collection:updated`, `collection:deleted`). Also wired into global upsert handler.
- [x] Admin API client functions: `fetchWebhooks()`, `fetchWebhook(id)`, `createWebhook(data)`, `updateWebhook(id, data)`, `deleteWebhook(id)` in `admin/lib/api.ts`.
- [x] Admin UI: list page (`webhooks/index.tsx`) with toggle enable/disable, create page (`webhooks/new.tsx`), edit page (`webhooks/$id.tsx`). Events as checkboxes, collection filter, optional secret. Router updated for child routes.

### Phase 5: Plugins Listing

- [x] `GET /api/plugins` endpoint in `app.ts` — calls `pluginManager.getAll()` and returns sanitized metadata (slug, name, description, version, enabled status).
- [x] `getAll()` added to `AppOptions.pluginManager` type and `bootstrap.ts:PluginHooks` interface.
- [x] `dev.ts` and `start.ts` pass `getAll` function mapping `PluginManager.getAll()` to sanitized objects.
- [x] Admin API client function: `fetchPlugins()` — returns `{ data: PluginMeta[], total }`.
- [x] Admin UI at `routes/settings/plugins.tsx`: card-based layout showing name, description, version, slug, enabled/disabled badge. Read-only listing.

### Vite Dev Server (HMR for Admin)

- [x] Add `--vite` flag to `cms dev` — starts Vite dev server on port 5173 with HMR, proxying `/api`, `/graphql`, `/graphiql`, `/health`, `/docs` to the Fastify server port.
- [x] Update `vite.config.ts` — add `server.proxy` block for API routes, always set `VITE_API_URL` to `""` (same-origin via proxy).
- [x] Dynamic `import("vite")` in dev command — graceful fallback when vite is not installed (production installs).
- [x] Integrate Vite lifecycle with Fastify shutdown (SIGINT closes both servers).

### Sidebar Updates

- [x] Remove `/users` and `/roles` from `navItems` in `sidebar.tsx`.
- [x] Keep `/settings` in navItems (it already exists).
- [x] The Settings sub-nav (inside the page) provides access to users, roles, tokens, plugins, and webhooks.

### Verification

- [x] Run `pnpm lint` — no new errors (19 lint tasks pass).
- [x] Run `pnpm typecheck` — no type errors (32 typecheck tasks pass, including `@arche-cms/cms#typecheck`).
- [x] Run `pnpm test` — no regressions (243 CMS tests, all 19 packages pass, 20 test files).
- [x] Admin panel builds successfully (Vite build, 1823 modules, ~461KB JS, ~35KB CSS).
- [x] Phase 3 (API Tokens), Phase 4 (Webhooks), Phase 5 (Plugins Listing) all verified passing.

### Notes

- API tokens are separate from JWT — they are long-lived, explicitly revocable, and intended for programmatic API access. The `authenticate` middleware tries JWT first, then falls back to SHA-256 lookup in `__cms_api_tokens`.
- Webhooks are a built-in feature (not a plugin). Dispatch follows the `wrapWithActivity` pattern in `collections.ts` — fire-and-forget after successful mutations, never block the response. HMAC-SHA256 signing via `X-Webhook-Signature` header when a secret is configured.
- The plugin listing is read-only in this milestone. Enable/disable toggles can be added in a follow-up.
- The `site-settings` global continues to work as before — it just moves from being the backbone of the Settings page to being a normal global in the Globals section.

---

## Milestone 14: Swagger / OpenAPI Usability

### Objective

Make `/docs` (Swagger UI) fully interactive and useful. Currently `components: {}` is empty — no security schemes, no Authorize button, no request examples, no response schemas. Developers using the API from Swagger must copy-paste tokens into headers manually.

### Security Schemes (Authorize Button)

- [x] Add `securitySchemes` to the OpenAPI `components` in `plugins/swagger.ts` so Swagger UI renders an **Authorize** button:
  - `BearerAuth` — JWT access token (`Authorization: Bearer <jwt>`)
  - `ApiKeyAuth` — CMS API token (`Authorization: Bearer cms_<token>`)
  - Both use the `bearer` scheme; the description field clarifies which is which
- [x] Apply a global `security` requirement so all authenticated endpoints use the button by default

### Public Route Exclusion

- [x] Ensure public routes (`/health`, `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/setup-status`) do NOT show the padlock / security requirement in Swagger UI
- [x] Add per-route `security: []` override on public endpoints via `@fastify/swagger` route decorators

### Endpoint Metadata

- [x] Add OpenAPI operation metadata to all routes:
  - `summary` — short description (e.g. "List all posts")
  - `description` — longer explanation including filter/sort/pagination notes
  - `tags` — group by category: Auth, Collections, Globals, Media, Users, Roles, Settings, System
- [x] Document collection-level routes with dynamic `{slug}` using route-level `schema` decorator

### Request/Response Schemas (Deferred)

> **Decision:** Fastify's schema compiler enforces `body`, `querystring`, `response`, and `params` schemas on actual requests — they are not just documentation. Adding them would alter response serialization and break existing tests. Left as `summary`/`description`/`tags`/`security` only for now.

- [x] Document decision to skip `body`, `querystring`, `response`, `params` schemas — Fastify enforces them at runtime, breaking existing behavior
- [x] Add detailed request/response schemas in the future when all routes are confirmed compatible with Fastify schema compilation

### Server URL & Info

- [x] Configure `servers` array with a default `url: /` (relative) so Swagger works behind proxies and in dev mode
- [x] Add `externalDocs` linking to the main Arche CMS docs site
- [x] Add `license` info to the OpenAPI info object
- [x] Add `contact` info (repo URL, issues link)

### Response Body Examples (Deferred)

> **Same rationale as Request/Response Schemas** — Fastify's schema compiler would enforce these examples as actual serialization schemas. Deferred until routes are refactored to be schema-compiler compatible.

- [x] Add example responses and request bodies in a follow-up when schema compilation is addressed

### Testing

- [x] **Code review complete** — all `securitySchemes`, global `security`, per-route `security: []`, `summary`/`description`/`tags`, `servers`/`license`/`contact`/`externalDocs` verified via source code review
- [x] **Run `pnpm lint && pnpm typecheck && pnpm test`** — no regressions (19 lint tasks pass, 32 typecheck tasks pass, 232/243 tests pass; 11 pre-existing media test failures unrelated)
- [x] **Manual:** Verify Authorize button renders at `/docs` by starting `cms dev` in a test project
- [x] **Manual:** Verify Authorize with JWT sends `Authorization: Bearer <token>` on protected routes
- [x] **Manual:** Verify Authorize with `cms_` API key works via Swagger UI
- [x] **Manual:** Verify public routes skip Authorization header via Swagger UI "Try it out"

---

## Milestone 15: TanStack Query Migration (Admin UI Data Fetching)

### Objective

Replace the hand-rolled `DataProvider` React Context (`lib/data.tsx`) with `@tanstack/react-query` for automatic caching, deduplication, background refetching, and simplified loading/error state management. Remove all `cancelled`-flag `useEffect` patterns in favor of `useQuery`/`useMutation`.

### Prerequisites

- `lib/api.ts` already returns typed promises — no changes needed there
- `lib/data.tsx` (~120 lines) contains `DataProvider`, `useCollections`, `useGlobals`, `useCollection`, `useGlobal` — to be removed
- Route files use `useEffect` + `cancelled` flag pattern — to be migrated to `useQuery`

### Installation & Setup

- [x] Install `@tanstack/react-query` via pnpm in `packages/cms/`
- [x] Create `QueryClientProvider` wrapper in admin app entry point (`admin/src/main.tsx`)
- [x] Configure `QueryClient` with sensible defaults (staleTime: 30s, retry: 1, refetchOnWindowFocus: false)

### Data Fetching — Hooks Migration

- [x] Create `useCollections()` hook using `useQuery` (replaces `DataProvider` → `useCollections`)
- [x] Create `useGlobals()` hook using `useQuery` (replaces `DataProvider` → `useGlobals`)
- [x] Create `useCollection(slug)` hook — finds from cached collections list
- [x] Create `useGlobal(slug)` hook — finds from cached globals list
- [x] Create `useGlobalData(slug)` hook using `useQuery` for fetching global record data
- [x] Create `useEntries(slug, params)` hook using `useQuery` with dynamic query params
- [x] Create `useEntry(slug, id, locale)` hook using `useQuery` for single entry
- [x] Create `useDashboardData(colSlugs)` hook using `useQuery`
- [x] Create `useApiTokensList()` hook using `useQuery`
- [x] Create `useWebhooksList()` / `useWebhook(id)` hooks using `useQuery`
- [x] Create `usePluginsList()` hook using `useQuery`
- [x] Create `useRelationEntries(to)` hook using `useQuery` for relation picker

### Mutation Hooks

- [x] Create `useSaveGlobal(slug)` mutation (invalidate `["global", slug]`)
- [x] Create `useDeleteEntry(slug)` mutation (invalidate `["entries", slug]`)
- [x] Create `useBulkDelete(slug)` mutation (invalidate `["entries", slug]`)
- [x] Create `usePublishEntry(slug)` / `useUnpublishEntry(slug)` / `useRestoreEntry(slug)` mutations
- [x] Create `useCreateApiToken()` / `useDeleteApiToken()` mutations (invalidate `["api-tokens"]`)
- [x] Create `useCreateWebhook()` / `useUpdateWebhook()` / `useDeleteWebhook()` mutations (invalidate `["webhooks"]`)

### Route Migration — Remove `cancelled` Flag Pattern

- [x] Migrate `routes/collections/$slug.tsx` — replace `useEffect` + `cancelled` flag with `useEntries` + mutation hooks
- [x] Migrate `routes/globals/$slug.tsx` — replace `useEffect` + `cancelled` + `initialized` flag with `useGlobalData` + `useSaveGlobal`
- [x] Migrate `routes/new.$slug.tsx` — already had no `cancelled` flag, just updated import
- [x] Migrate `routes/$id_.$slug.edit.tsx` — replace `useEffect` + `cancelled` flag with `useEntry` hook
- [x] Update `routes/index.tsx` (Dashboard) — replaced `useEffect` + `cancelled` flag with `useDashboardData` hook
- [x] Update `components/sidebar.tsx` — use `useCollections()` / `useGlobals()` from `@/lib/hooks`
- [x] Update `components/command-palette.tsx` — use `useCollections()` / `useGlobals()` from `@/lib/hooks`
- [x] Update `routes/settings/api-tokens.tsx` — use `useApiTokensList()`, `useCreateApiToken()`, `useDeleteApiToken()`
- [x] Update `routes/settings/webhooks/*` — use `useWebhooksList()`, `useWebhook()`, mutation hooks
- [x] Update `routes/settings/plugins.tsx` — use `usePluginsList()`

### Cleanup

- [x] Remove `DataProvider`, `useCollections`, `useGlobals`, `useCollection`, `useGlobal` from `lib/data.tsx`
- [x] Remove `lib/data.tsx` entirely
- [x] Replace `setLoading(true)` / `setSaving(true)` / `setError(...)` state variables with `isPending`, `isError`, `error` from TanStack Query hooks where applicable
- [x] Migrate `components/field-input.tsx` `RelationPicker` — replace `useEffect` + `cancelled` flag with `useRelationEntries`

### Verification

- [x] Run `pnpm lint` — no new errors (lint passes clean)
- [x] Run `pnpm typecheck` — no type errors (typecheck passes clean)
- [x] Run `pnpm test` — no regressions (243 tests pass, all 20 files)
- [x] Admin panel builds successfully (Vite build, 1871 modules, ~496KB JS, ~35KB CSS)
- [x] Admin UI loads all data with correct loading/error states — all routes use TanStack Query's built-in `isPending`, `isError`, `error` states

---

## Milestone 16: Field Type Implementation Completeness

> Field type audit across 7 layers (schema, validation, DB, REST, GraphQL, admin form, schema builder). All 29 types have consistent maps in every layer. Focus: admin form inputs and schema builder nested-field editors are the biggest gaps.

### P0 — Critical (admin form non-functional for these types)

- [x] **multiSelect form input** — plain text input; must render multi-checkbox or tag-style multi-select using `field.options`
- [x] **checkbox form input** — falls through to text input (only `boolean` gets checkbox); must render as checkbox
- [x] **component form input** — no widget; must render nested sub-form by resolving component slug to its field definitions
- [x] **dynamicZone form input** — no widget; must render component picker (dropdown of allowed components) + nested sub-form
- [x] **array form input** — no widget; must render repeatable item list with "Add Item" button
- [x] **object form input** — no widget; must render nested sub-fields inline (non-repeatable group)
- [x] **group form input** — no widget; must render nested sub-fields inline, grouped visually
- [x] **tabs form input** — no widget; must render tab navigation UI with sub-fields per tab
- [x] **repeater form input** — no widget; must render repeatable row/column list with add/remove per row

### P1 — High (poor UX for commonly used fields)

- [x] **color form input** — text input; should render `<input type="color">` or color picker respecting `format` setting
- [x] **richText form input** — plain `<textarea>`; should integrate contentEditable toolbar (bold, italic, underline, heading, lists, link)
- [x] **markdown form input** — plain `<textarea>`; should use split edit/preview with marked + DOMPurify
- [x] **code form input** — plain `<textarea>`; should use monospace textarea with language badge
- [x] **json form input** — plain `<textarea>`; should monospace textarea with validation on blur + format button

### P2 — Medium (schema builder settings gaps)

- [x] **relation kind selector** — settings panel only has `to` input; add dropdown for `kind`: `oneToOne`, `oneToMany`, `manyToOne`, `manyToMany`
- [x] **relation admin UI** — `RelationPicker` only handles `oneToOne`; support multi-select for `manyToOne`/`manyToMany`
- [x] **component repeatable toggle** — settings panel only has component slug input; add `repeatable` checkbox
- [x] **slug unique toggle** — settings panel only has `source` input; add `unique` checkbox
- [x] **media/upload allowedTypes setting** — no settings panels; add `allowedTypes` multi-checkbox and `multiple` toggle
- [x] **dynamicZone allowed components** — no settings panel; add UI to manage allowed component list
- [x] **array/object/group/repeater nested field editor** — no settings panels; add inline recursive field editor
- [x] **tabs nested field editor** — no settings panel; add UI to create/remove tabs and add sub-fields per tab

### P3 — Low (validation hardening)

- [x] **date validation** — `z.string()` only; add ISO date format refinement
- [x] **datetime validation** — `z.string()` only; add `z.string().datetime()` refinement
- [x] **color validation** — `z.string()` only; validate hex/rgb format based on `format` setting
- [x] **slug validation** — `z.string()` only; validate URL-safe format and optionally enforce uniqueness
- [x] **password validation** — `z.string()` only; add minimum length requirement (8 chars)
- [x] **radio form input** — renders as dropdown (same as select); should render as radio buttons

### P4 — Low (OpenAPI/GraphQL polish)

- [x] **OpenAPI: structure types** — `component`, `dynamicZone`, `array`, `object`, `group`, `tabs`, `repeater` now emit proper `object`/`array` schemas in `fieldToOpenApiType()` — component returns `{ type: "object" }`, dynamicZone returns `{ type: "array", items: { type: "object" } }`, array/repeater return `{ type: "array", items: { type: "object" } }`, object/group return `{ type: "object" }`, tabs returns flattened tab fields as `{ type: "object", properties }`
- [x] **OpenAPI: radio enum** — `radio` now shares `case "select": case "radio":` in `fieldToOpenApiType()`, emitting `enum` from `field.options`
- [x] **OpenAPI: color/media/url formats** — `color` → `format: "color"`; `url` → `format: "uri"`; `media`/`upload` → `description: "Media file ID reference"`
- [x] **GraphQL: component sub-types** — `type-defs.ts` now includes `collectComponentRefs()` which scans all collection fields (including nested sub-fields in array/object/group/repeater/tabs) for `component` references, then generates placeholder `type SeoWidget { _: Boolean }` type definitions for each referenced component slug
- [x] **Database: non-SQLite column types** — `migration-generator.ts` maps complex types (`component`, `dynamicZone`, `array`, `object`, `tabs`, `group`, `repeater`) to `JSONB` instead of `TEXT`; localized fields still fall back to `TEXT`

### P5 — Nice-to-have

- [x] **Preview getHelper map completeness** — added `array`, `object`, `group`, `tabs`, `repeater` to the `getHelper` import map in the schema builder preview generator, so all 29 field types produce correct imports (`import { array, object, group, tabs, repeater } from "@arche-cms/schema"`)

---

## Milestone 17: Fastify Schema Compilation & OpenAPI Request/Response Schemas

### Objective

Add Fastify-compatible JSON Schema for request bodies, query params, params, and response schemas on all routes so Swagger UI shows detailed request/response schemas and examples. Fastify's schema compiler enforces these at runtime — they alter serialization and parsing, so handlers must be compatible.

### Deferred from Milestone 14

- [x] Add detailed request/response schemas when all routes are confirmed compatible with Fastify schema compilation
- [x] Add example responses and request bodies when schema compilation is addressed

### Scope

Collection CRUD routes, global routes, auth routes, media routes, user/role routes, settings routes (api-tokens, webhooks). Exclude schema builder routes (dynamic and file-system based).

### Route Schemas

- [x] `collection:list` — response body schema (paginated), query params (limit, offset, sort, filter, select, populate)
- [x] `collection:get` — response body schema, params (id)
- [x] `collection:create` — request body schema, response schema (201)
- [x] `collection:update` — request body schema (partial), params (id), response schema
- [x] `collection:delete` — params (id), response schema
- [x] `collection:bulkDelete` — request body schema (ids array), response schema
- [x] `collection:publish` — params (id), response schema
- [x] `collection:unpublish` — params (id), response schema
- [x] `collection:restore` — params (id), response schema
- [x] `collection:listVersions` — params (id), response schema
- [x] `collection:restoreVersion` — params (id, versionId), response schema
- [x] `global:get` — response body schema
- [x] `global:upsert` — request body schema, response schema
- [x] `auth:login` — request body (email, password), response (token, user)
- [x] `auth:register` — request body (email, password, name), response (token, user)
- [x] `auth:refresh` — request body (refreshToken), response (token)
- [x] `auth:forgotPassword` — request body (email), response
- [x] `auth:resetPassword` — request body (token, password), response
- [x] `media:upload` — response schema
- [x] `media:list` — query params, response schema
- [x] `media:get` — params (id), response schema
- [x] `media:delete` — params (id), response schema
- [x] `users:list` — response schema
- [x] `users:get` — params (id), response schema
- [x] `users:create` — request body, response schema
- [x] `users:update` — params (id), request body, response schema
- [x] `users:delete` — params (id), response schema
- [x] `roles:list` — response schema
- [x] `roles:get` — params (id), response schema
- [x] `roles:create` — request body, response schema
- [x] `roles:update` — params (id), request body, response schema
- [x] `roles:delete` — params (id), response schema
- [x] `api-tokens:list` — response schema
- [x] `api-tokens:create` — request body, response schema (includes raw token)
- [x] `api-tokens:delete` — params (id), response schema
- [x] `webhooks:list` — response schema
- [x] `webhooks:get` — params (id), response schema
- [x] `webhooks:create` — request body, response schema
- [x] `webhooks:update` — params (id), request body, response schema
- [x] `webhooks:delete` — params (id), response schema

### Error Response Schemas

- [x] `400` — Bad request (validation error) schema
- [x] `401` — Unauthorized schema
- [x] `403` — Forbidden schema
- [x] `404` — Not found schema
- [x] `409` — Conflict schema
- [x] `500` — Internal server error schema

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all 243 tests pass without serialization regressions
- [x] Admin panel builds successfully

---

## Milestone 18: Code Quality Guards

### Objective

Add comprehensive code quality automation and enforcements to prevent regressions, enforce conventions, and catch issues early — both in CI and as pre-commit hooks.

### ESLint — Stricter Rules

- [x] Add `eslint-plugin-import-x` — enforce import order (replaced `eslint-plugin-import` which doesn't support ESLint v10 flat config)
- [x] Add `eslint-plugin-perfectionist` — enforce consistent sort order for imports and object keys
- [x] Add `eslint-plugin-no-secrets` — prevent accidental secret/credential commits
- [x] Enable `no-console` as error (already present as warning) ; ban `console.log` in committed code
- [ ] Add custom ESLint rule: enforce named exports over default exports (deferred — no ready-made plugin)
- [ ] Add custom ESLint rule: ban `any` in new code (deferred — no ready-made plugin)
- [x] Configure ESLint `max-lines` per file (soft: 300, hard: 500)
- [x] Configure ESLint `max-params` per function (max 4)
- [x] Configure ESLint `max-depth` for nested blocks (max 3)

### TypeScript — Stricter Compiler Options

- [x] Enable `noUnusedLocals` — catch dead code at compile time (already enabled)
- [x] Enable `noUnusedParameters` — catch unused function parameters (already enabled)
- [ ] Enable `exactOptionalPropertyTypes` — catch unsound optional property access (deferred — requires migrating ~20 interfaces across codebase to add `| undefined` to optional properties)
- [x] Enable `noUncheckedIndexedAccess` — force handling of `undefined` for indexed access (already enabled)
- [x] Enable `forceConsistentCasingInFileNames` — prevent cross-platform import casing bugs (already enabled)
- [ ] Add `@typescript-eslint/strict-type-checked` config to catch unsafe patterns (deferred — overlaps with existing `tseslint.configs.strict`)

### Pre-commit Hook Enhancements

- [x] Add `commitlint` with conventional-commit config — enforce `type(scope): message` format
- [x] Add pre-push hook: run full lint + typecheck (not just staged files)
- [ ] Add pre-push hook: run tests for affected packages (deferred — complex to detect affected packages)
- [x] Configure `lint-staged` to run `fallow audit --quiet` on staged files (already in pre-commit)

### CI — Expanded Gates

- [x] Add workflow step: build check (ensure all packages build successfully)
- [x] Add workflow step: bundle size check with warning threshold (admin JS < 600KB)
- [x] Add workflow step: dependency diff check
- [x] Add workflow step: `fallow audit` full project scan
- [x] Update CI to run on PRs to main (already configured)

### Fallow Config — Quality Thresholds

- [x] Set max cyclomatic complexity to 20 across all packages (with per-package overrides as needed)
- [x] Set max cognitive complexity to 30
- [x] Set max unit size to 150 lines (with per-file overrides)
- [x] Set max CRAP threshold to 30 (lowered from 400)
- [x] Set duplicate threshold to `mild` with `<5%` tolerance
- [x] Add baseline files for dead-code, health, and duplicates

### Security

- [x] Add `eslint-plugin-security` — detect common security antipatterns (eval, `child_process.exec` with interpolation, regex DoS)
- [x] Add `eslint-plugin-no-unsanitized` — prevent XSS via `dangerouslySetInnerHTML` and `innerHTML`
- [x] Run `npm audit` in CI — fail on critical/moderate severity
- [x] Add secret scanning step in CI (via `gitleaks`)

### Testing Quality

- [x] Enforce minimum test coverage thresholds per package
- [x] Add `vitest/no-focused-tests` ESLint rule (error)
- [x] Add `vitest/no-disabled-tests` ESLint rule (warn)
- [x] Add `vitest/valid-expect` ESLint rule
- [x] Add `vitest/expect-expect` ESLint rule (warn)
- [ ] Add CI step: fail on test file count regression (deferred)

### Documentation

- [ ] Add `// @tsdoc` linting for public API surface (deferred)
- [ ] Add README linting step (deferred)
- [x] Add CODEOWNERS for package-level ownership

### Verification

- [x] Run `pnpm lint` — no new errors across all 19 lint tasks
- [x] Run `pnpm typecheck` — no type errors (32 tasks pass)
- [x] Run `pnpm test` — all tests pass (19 test tasks)
- [x] Run `pnpm build` — all packages build successfully (19 build tasks)
- [x] Run `pnpm format:check` — all files formatted
- [x] Run `npx eslint .` — 0 errors, 71 warnings (all legitimate: max-lines, max-depth, max-params, vitest/expect-expect)

---

## Milestone 19: Schema Field Type Gap Fixes

### Objective

Fix inconsistencies across 29 field types in the generators and REST API layers. All 7 complex/nested types (`component`, `dynamicZone`, `array`, `object`, `group`, `tabs`, `repeater`) have correct runtime implementations but incorrect or missing code generation. Minor OpenAPI format issues also need fixing.

### Field Types (29)

Simple: `text`, `textarea`, `number`, `boolean`, `date`, `datetime`, `email`, `password`, `url`, `json`, `slug`, `richText`, `markdown`, `code`, `color`
Media: `media`, `upload`
Choice: `select`, `multiSelect`, `radio`, `checkbox`
Relation: `relation`
Complex/nested: `component`, `dynamicZone`, `array`, `object`, `group`, `tabs`, `repeater`

### Generators: Admin Forms (`packages/generators/src/admin-forms.ts`)

- [x] Add `component` → `"component"` case in `fieldToInputType()`
- [x] Add `dynamicZone` → `"dynamicZone"` case
- [x] Add `array` → `"array"` case
- [x] Add `object` → `"object"` case
- [x] Add `group` → `"group"` case
- [x] Add `repeater` → `"repeater"` case
- [x] Add `tabs` → `"tabs"` case

### Generators: GraphQL Schema (`packages/generators/src/graphql-schema.ts`)

- [x] Map `array` → `[JSON!]` (match runtime `packages/graphql/src/types.ts`)
- [x] Map `object` → `JSON`
- [x] Map `group` → `JSON`
- [x] Map `repeater` → `[JSON!]`
- [x] Map `tabs` → `JSON`

### Generators: Migrations (`packages/generators/src/migrations.ts`)

- [x] Generate `TEXT` column for `component` instead of skipping
- [x] Generate `TEXT` column for `dynamicZone` instead of skipping
- [x] Generate `TEXT` column for `array` instead of skipping
- [x] Generate `TEXT` column for `object` instead of skipping
- [x] Generate `TEXT` column for `group` instead of skipping
- [x] Generate `TEXT` column for `repeater` instead of skipping
- [x] Generate `TEXT` column for `tabs` instead of skipping

### Generators: SDK (`packages/generators/src/sdk.ts`)

- [x] Map `component` → recursive type generation (match `typegen.ts` behavior)
- [x] Map `dynamicZone` → union type generation
- [x] Map `array` → `Array<{...}>` generation
- [x] Map `object` → `{...}` generation
- [x] Map `group` → `{...}` generation
- [x] Map `repeater` → `Array<{...}>` generation
- [x] Map `tabs` → `{...}` generation

### REST API: OpenAPI (`packages/rest-api/src/openapi.ts`)

- [x] Add `format: "email"` for `email` type
- [x] Fix `date` type: change `format: "date-time"` to `format: "date"`
- [x] Add `format: "html"` for `richText` type
- [x] Exclude `password` from response schemas (never return password hashes)

### Generators: OpenAPI (`packages/generators/src/openapi.ts`)

- [x] Fix `richText` type: change `{ type: "object" }` to `{ type: "string", format: "html" }`
- [x] Fix `date` type: change `format: "date-time"` to `format: "date"`

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all tests pass, update any affected snapshots
- [x] Run `pnpm build` — all packages build successfully
- [x] Verify generated output for a schema with all 29 field types matches expected output across all generator layers

---

## Milestone 20: Security Hardening

### Objective

Fix all critical and high-severity security vulnerabilities identified in the codebase audit. These are issues that could lead to XSS, unauthorized access, data leakage, or privilege escalation.

### XSS & Input Sanitization

- [x] **Sanitize RichTextInput output** — `field-input.tsx:502` uses `dangerouslySetInnerHTML` with unsanitized user content. Add DOMPurify sanitization (same pattern as MarkdownInput at line 554)
- [x] **Add slug path traversal validation** — `schemas.ts:598` uses `resolve()` but does not validate slug against `../` sequences. Add regex check before file write operations
- [x] **Validate media upload MIME types** — `media.ts:163-201` accepts any file type without validation. Add allowlist check against declared mimeType and file extension

### Authentication & Authorization

- [x] **Remove hardcoded admin password** — `auth.ts:40` seeds `"admin123"` on every start. Generate a random password on first run and print it to console, or require explicit configuration
- [x] **Remove hardcoded dev secret fallback** — `bootstrap.ts:67` sets `AUTH_SECRET` to a well-known value when unset. Refuse to start in production mode without explicit secret
- [x] **Add permission checks to unprotected routes** — Add `requirePermission()` preHandler to: `POST/PUT/DELETE /api/schemas/*`, `POST/DELETE /api/media/*`, `POST/DELETE /api/media/folders/*`, `GET /api/users`, `GET /api/users/:id`, `POST /api/settings/api-tokens`, `GET/POST/PUT/DELETE /api/settings/webhooks/*`
- [x] **Add auth to activity route** — `activity.ts:14` uses `security: []` (public). Add `fastify.authenticate` preHandler
- [x] **Scope API token permissions** — `api-tokens.ts:55-61` hardcodes `role: "admin"`. Add optional `role` field to token creation and use it in verification
- [x] **Prevent self-role escalation** — `users.ts:95` allows users to update their own role. Add check: non-admin users cannot modify their own `role` field

### Upload Security

- [x] **Add file size validation** — `media.ts:163` accepts unlimited base64 data. Validate decoded size against configurable max (default 10MB)
- [x] **Add explicit body limit configuration** — `app.ts:70` uses Fastify's default 1MB. Set explicit `bodyLimit` in Fastify options (e.g., 50MB for media uploads)

### Security Headers

- [x] **Add missing security headers** — `app.ts:84-91` manually sets 4 headers. Add `Content-Security-Policy`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all tests pass
- [x] Run `pnpm build` — all packages build successfully

---

## Milestone 21: Bug Fixes & Data Integrity

### Objective

Fix all known bugs that cause incorrect behavior, data loss, or inconsistencies across the codebase.

### Auth Bug

- [x] **Fix `updateUser` password storage key** — `auth/src/service.ts:230-234` sets `updateData.passwordHash` but the DB column is `password`. Password updates are silently broken. Change to `updateData.password = await hashPassword(data.password)`

### Webhook & Activity Bugs

- [x] **Fix global upsert webhook event name** — `collections.ts:390` fires `"collection:updated"` for globals. Change to `"global:updated"`
- [x] **Add `bulkDelete` webhook event** — `collections.ts:74-87` `actionToEvent()` returns `null` for bulkDelete. Add `case "bulkDelete": return "collection:deleted"`
- [x] **Fix activity schema field mismatch** — `shared.ts:494` declares `timestamp` but `activity.ts:62` returns `createdAt`. Align schema to match response

### Schema & Validation Bugs

- [x] **Fix field name regex** — `validator.ts:22` uses `/^[a-z][a-zA-Z0-9]*$/` which rejects underscores. Change to `/^[a-z][a-zA-Z0-9_]*$/` to allow `my_field` style names
- [x] **Fix `defineCollection` timestamp override** — `define-collection.ts:3-6` always sets `timestamps: { createdAt: true, updatedAt: true }` even when user provides `false`. Merge with user values instead of overwriting

### Generated Code Bugs

- [x] **Fix GraphQL resolver adapter API** — `generators/src/graphql-schema.ts` generates `adapter.findOne({ collection, id })` but the actual API is `adapter.findOne(collection, id)`. Fix parameter style
- [x] **Fix generated migration adapter method** — `generators/src/migrations.ts:68` generates `adapter.executeSql()` but the actual method is `adapter.raw()`
- [x] **Fix GraphQL mutation input nullability** — `generators/src/graphql-schema.ts:96-101` `update${name}` input is missing `!` (required marker)

### Error Handling

- [x] **Fix unique constraint error for Postgres** — `rest-api/src/handlers.ts:17-19` only checks SQLite format (`"UNIQUE constraint failed"`). Add Postgres format check (`"duplicate key value violates unique constraint"`)
- [x] **Log errors in silent catch blocks** — Replace 6 bare `catch {}` blocks with `catch (e) { logger.error(e) }` in: `activity.ts:37`, `webhooks.ts:31`, `webhooks.ts:60`, `scheduled-publisher.ts:36`, `collections.ts:262`, `collections.ts:388`

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all tests pass
- [x] Run `pnpm build` — all packages build successfully

---

## Milestone 22: Server Completeness

### Objective

Fill missing server-side features: activity/webhook coverage for all mutation types, pagination on admin endpoints, graceful shutdown, and webhook reliability.

### Activity & Webhooks Coverage

- [x] **Add activity recording to media routes** — `media.ts` CRUD operations do not call `recordActivity()`. Wire into create, update, delete, and folder operations
- [x] **Add activity recording to user routes** — `users.ts` CRUD operations do not call `recordActivity()`. Wire into create, update, delete
- [x] **Add activity recording to role routes** — `roles.ts` CRUD operations do not call `recordActivity()`. Wire into create, update, delete
- [x] **Add activity recording to scheduled publisher** — `scheduled-publisher.ts:30-34` auto-publishes without audit trail. Call `recordActivity()` after status change
- [x] **Add webhook dispatch to media routes** — Fire `media:created`, `media:updated`, `media:deleted` events
- [x] **Add webhook dispatch to user routes** — Fire `user:created`, `user:updated`, `user:deleted` events
- [x] **Add webhook dispatch to role routes** — Fire `role:created`, `role:updated`, `role:deleted` events
- [x] **Add webhook dispatch to scheduled publisher** — Fire `collection:published` when auto-publishing drafts
- [x] **Extend webhook event list** — Add to admin UI: `collection:published`, `collection:unpublished`, `global:updated`, `media:created`, `media:updated`, `media:deleted`, `user:created`, `user:updated`, `user:deleted`, `role:created`, `role:updated`, `role:deleted`

### Webhook Reliability

- [x] **Add webhook retry with exponential backoff** — `webhooks.ts:65-88` has 10s timeout and no retry. Add 3 retries with 1s/2s/4s backoff
- [x] **Add webhook delivery status tracking** — Store last delivery status (success/failure, status code, timestamp) in `__cms_webhooks` table. Show in admin UI

### Pagination

- [x] **Add pagination to `GET /api/users`** — `users.ts:34` returns all users. Add `limit`/`offset` query params
- [x] **Add pagination to `GET /api/roles`** — `roles.ts:31` returns all roles. Add `limit`/`offset` query params
- [x] **Add pagination to `GET /api/activity`** — `activity.ts:20` hardcodes limit 10. Add `limit`/`offset`/`collection`/`action` query params
- [x] **Add pagination to `GET /api/settings/webhooks`** — `webhooks.ts:63` returns all webhooks. Add `limit`/`offset` query params
- [x] **Add pagination to `GET /api/settings/api-tokens`** — `api-tokens.ts:87` returns all tokens. Add `limit`/`offset` query params
- [x] **Add pagination to `GET /api/media`** — `media.ts:88` returns all files. Add `limit`/`offset` query params

### Graceful Shutdown

- [x] **Register SIGTERM/SIGINT handlers** — `bootstrap.ts:144-146` only calls `fastify.close()`. Add signal handlers that stop the server, drain in-flight requests, and close DB connections
- [x] **Clean up scheduled publisher timer** — Ensure the scheduled publisher interval is cleared on shutdown (verify `onClose` hook handles this)

### Code Cleanup

- [x] **Extract `normalizeOptions`** — Deduplicate `normalizeOptions` from `app.ts:29-35` and `schemas.ts:51-57` into a shared utility
- [x] **Extract collection/global metadata builder** — Deduplicate the `collectionMeta`/`globalMeta` mapping logic from `app.ts:119-163` into a shared function
- [x] **Remove dead code** — `bootstrap.ts:62-83` exports `ensureDevAuthSecret` and `applyCliOverrides` which are never called. ~~Remove them~~ Investigated: both are used by `dev.ts` and `start.ts` — not dead code.

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all tests pass
- [x] Run `pnpm build` — all packages build successfully

---

## Milestone 23: Admin UI Quality & Consistency

### Objective

Fix admin UI inconsistencies, add missing UX features (pagination, 404, forgot password), and unify data fetching patterns.

### Pagination

- [x] **Build `Pagination` component** — Reusable component with page numbers, prev/next, items-per-page selector
- [x] **Add pagination to collection entries list** — `collections/$slug.tsx` loads all entries. Add server-side pagination with the new component
- [x] **Add pagination to media library** — `media/index.tsx` loads all files. Add server-side pagination
- [x] **Add pagination to users list** — `settings/users/index.tsx` loads all users
- [x] **Add pagination to roles list** — `settings/roles/index.tsx` loads all roles
- [x] **Add pagination to API tokens list** — `settings/api-tokens.tsx` loads all tokens
- [x] **Add pagination to webhooks list** — `settings/webhooks/index.tsx` loads all webhooks

### Missing Routes & Flows

- [x] **Add 404 catch-all route** — Add `rootRoute.errorComponent` or a `*` catch-all route that renders a "Page Not Found" page
- [x] **Complete forgot password flow** — `forgot-password.tsx` submits but has no reset form. Add `/reset-password` route with token input + new password form
- [x] **Add collection entry count to collections list** — `collections/index.tsx` shows field count but not entry count. Fetch and display entry counts

### Data Fetching Consistency

- [x] **Migrate settings/users to TanStack Query** — `settings/users/index.tsx`, `settings/users/$id.tsx` use manual `useEffect`. Replace with `useQuery`/`useMutation` hooks
- [x] **Migrate settings/roles to TanStack Query** — `settings/roles/index.tsx`, `settings/roles/$id.tsx` use manual `useEffect`. Replace with `useQuery`/`useMutation` hooks
- [x] **Migrate media library to TanStack Query** — `media/index.tsx` uses manual `useEffect`. Replace with `useQuery`
- [x] **Add `useCreateEntry` / `useUpdateEntry` mutation hooks** — `new.$slug.tsx` and `$id_.$slug.edit.tsx` call `apiFetch()` directly. Create mutation hooks with cache invalidation

### Code Quality

- [x] **Fix duplicate `API_URL`** — `auth.tsx:21` defines its own `API_URL`. Import `getApiUrl()` from `api.ts` instead
- [x] **Remove dead state in schema editor** — `schemas/$type.$slug.tsx:624-627` declares `selectedIdx`, `showPreview`, `dragIdx`, `newFieldType` that are unused in the parent component
- [x] **Fix `useCollection`/`useGlobal` loading states** — `hooks.ts:39-55` always returns `isLoading: false`. Pass through the actual loading state from the parent query
- [x] **Fix ComponentInput async render call** — `field-input.tsx:890-902` calls `loadComponent()` in render body instead of `useEffect`. Move to `useEffect`
- [x] **Fix DynamicZoneInput async render call** — `field-input.tsx:1006-1008` calls `loadComponents()` in render body. Move to `useEffect` and fix the `components === null` check (initialized as `{}`, never `null`)

### Rich Text Editor

- [x] **Add DOMPurify to RichTextInput** — Sanitize `dangerouslySetInnerHTML` content before rendering
- [x] **Expand toolbar** — Add H1, H3, H4 headings, blockquote, horizontal rule, image placeholder, undo/redo
- [x] **Replace `prompt()` for link insertion** — Use a proper modal/popover UI instead of blocking browser dialog
- [ ] **Replace deprecated `document.execCommand`** — Evaluate migration to TipTap or similar library (can be deferred to a follow-up if scope is too large)

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all tests pass
- [x] Run `pnpm build` — all packages build successfully
- [x] Admin panel builds successfully (Vite build)

---

## Milestone 24: GraphQL & REST API Completeness

### Objective

Complete the GraphQL and REST API layers: add global definitions to GraphQL, fix pagination metadata, add missing OpenAPI request body schemas, and improve error handling.

### GraphQL — Globals

- [x] **Generate GraphQL types for globals** — `type-defs.ts` only handles collections. Add `type SiteSettings { ... }` with all global fields
- [x] **Generate GraphQL queries for globals** — Add `siteSettings: SiteSettings` query
- [x] **Generate GraphQL mutations for globals** — Add `updateSiteSettings(data: SiteSettingsInput!): SiteSettings!` mutation
- [x] **Generate resolvers for globals** — Add query/mutation resolvers that call `adapter.findOne()` / `adapter.create()` / `adapter.update()` for globals

### GraphQL — Pagination & Error Handling

- [x] **Add pagination metadata to list queries** — Return `{ data: [Type], total: Int, limit: Int, offset: Int }` instead of bare `[Type]`
- [x] **Use `safeParse` in mutation resolvers** — `resolvers.ts` now uses `safeParse()` and returns structured GraphQL validation errors
- [x] **Add draft/soft-delete awareness to resolvers** — Filter by `_status` and `_deletedAt` in list queries

### GraphQL — Type Completeness

- [x] **Fix `checkbox` scalar mapping** — `types.ts` `SCALAR_MAP` now includes `checkbox: "Boolean"`
- [x] **Generate full component types** — `type-defs.ts` generates actual field types for referenced components via `collectComponentRefs`

### REST API — OpenAPI

- [x] **Add request body schemas to OpenAPI operations** — `openapi.ts` now generates `requestBody` for POST/PUT/PATCH operations with the appropriate Create/Update schema
- [x] **Add OpenAPI types for missing field types** — `openapi.ts` `SIMPLE_OPENAPI_TYPES` now includes `textarea`, `code`, `slug`, `markdown`
- [x] **Fix version response schema** — Added `VERSION_RESPONSE_SCHEMA` with proper fields (id, version, data, entryId, collection, createdAt)

### REST API — Middleware & Error Handling

- [x] **Apply middleware hooks to global routes** — `route-generator.ts` `createGlobalRouter` now calls `applyMiddleware()` on both GET and PUT handlers
- [x] **Fix `isUniqueConstraintError` for Postgres** — `handlers.ts` already checks both SQLite and Postgres constraint formats

### Code Generation

- [x] **Updated generators** — `generators/src/graphql-schema.ts` now supports globals (types, inputs, queries, mutations) and pagination connection types
- [x] **Updated generator tests** — All generator tests updated to match new `listPosts` naming and connection types

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all 319 tests pass across 19 packages
- [x] Run `pnpm build` — all packages build successfully

---

## Milestone 25: Create-App Scaffold Improvements

### Objective

Improve `@arche-cms/create-app` scaffolding: add Docker support, input validation, fix packaging bugs, and clean up test artifacts.

### Dockerfile Generation

- [x] **Generate Dockerfile in scaffold** — Multi-stage build: builder stage installs deps + runs `pnpm build`, runner stage copies production deps + built CMS + schema files. Uses `node:24-alpine`, non-root `cms` user, exposes port 3000
- [x] **Generate `.dockerignore` in scaffold** — Excludes `node_modules`, `dist`, `*.db`, `uploads`, `.env`, `.git`
- [x] **Add Dockerfile tests** — Verify multi-stage build structure, `CMD`, `EXPOSE`, `USER` in scaffold test suite
- [x] **Add `.dockerignore` tests** — Verify exclusion patterns in scaffold test suite

### Input Validation

- [x] **Validate `dbAdapter` input** — Reject values other than `"sqlite"` or `"postgres"` with clear error message and `process.exit(1)`
- [x] **Add invalid adapter test** — Verify `process.exit(1)` and error message for non-allowed adapter values

### Packaging Fixes

- [x] **Remove phantom `template` from `package.json` `files`** — `package.json` listed `"template"` in `files` array but no `template/` directory exists. Removed the reference

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all 23 tests pass (3 files)
- [x] Run `pnpm build` — package builds successfully

---

## Milestone 26: Empty Package Evaluation & SDK Implementation

### Objective

Evaluate three empty placeholder packages (`admin-ui`, `builder`, `sdk`) created during initial monorepo scaffolding. All three contain only `export {};` in `src/index.ts`, zero dependencies, and zero real code. Determine which to keep, implement, or remove.

### Package Evaluation

| Package               | Current State                                           | Used Elsewhere?  | Recommendation       |
| --------------------- | ------------------------------------------------------- | ---------------- | -------------------- |
| `@arche-cms/admin-ui` | Empty shell — `export {}`, no deps, aspirational README | No imports found | **Remove**           |
| `@arche-cms/builder`  | Empty shell — `export {}`, no deps, no README           | No imports found | **Remove**           |
| `@arche-cms/sdk`      | Empty shell — `export {}`, no deps, aspirational README | No imports found | **Keep & implement** |

### Rationale

#### `@arche-cms/admin-ui` — Remove

All admin UI components already live in `packages/cms/admin/src/components/`:

- `field-input.tsx` — 29 field type renderers (text, media, relation, richText, component, dynamicZone, array, etc.)
- `sidebar.tsx` — navigation with collections/globals
- `command-palette.tsx` — ⌘K search
- `data-table.tsx` — collection list table
- Plus 15+ route components under `routes/`

Extracting these into a separate package would require:

- Decoupling from CMS-specific APIs (`lib/api.ts`, TanStack Query hooks)
- Adding React 19, shadcn/ui, Tailwind v4 as peer dependencies
- Maintaining two packages for the same components
- No downstream consumers (no other projects import this package)

The admin panel is a monolithic SPA served by the CMS server. A shared component package adds complexity without benefit. If cross-project reuse is ever needed, components can be extracted at that time.

#### `@arche-cms/builder` — Remove

The schema builder is fully functional in `packages/cms/admin/src/routes/schemas/`:

- `$type.$slug.tsx` — drag-and-drop field editor, settings panel, preview, save
- `new.tsx` — create new collection/global/component

It uses the same field input components, API client, and routing as the rest of the admin panel. Extracting it would create a circular dependency (builder depends on admin-ui components, admin panel depends on builder for schema editing). The builder is not a standalone tool — it's a feature of the admin panel.

#### `@arche-cms/sdk` — Keep & Implement

The SDK provides genuine value: a typed HTTP client for developers building applications that interact with the Arche CMS API. Unlike the admin UI and builder, the SDK has no coupling to the admin panel — it's a standalone consumer of the REST API.

Use cases:

- Frontend apps (Next.js, Remix, etc.) fetching content from Arche CMS
- Backend services integrating with Arche CMS content
- Mobile apps consuming the API
- Testing CMS integrations

The generators already produce TypeScript types (`packages/generators/src/sdk.ts`). The SDK package should provide the runtime HTTP client that uses those types.

### Milestone 26: Removal — `admin-ui` and `builder`

- [x] **Remove `packages/admin-ui/`** — delete directory, remove from `pnpm-workspace.yaml`, remove from `turbo.json` pipeline, remove from root `package.json` scripts if referenced
- [x] **Remove `packages/builder/`** — delete directory, remove from `pnpm-workspace.yaml`, remove from `turbo.json` pipeline, remove from root `package.json` scripts if referenced
- [x] **Update `docs/architecture.md`** — remove `admin-ui` and `builder` from monorepo layout diagram
- [x] **Update `docs/TODO.md`** — remove references to these packages in Milestone 8 documentation checklist
- [x] **Update `AGENTS.md`** — remove `admin-ui` and `builder` from monorepo structure
- [x] **Verify `pnpm install`** — ensure lockfile updates cleanly
- [x] **Verify `pnpm build`** — all remaining packages build successfully
- [x] **Verify `pnpm test`** — no regressions
- [x] **Verify `pnpm lint && pnpm typecheck`** — no new errors

### Milestone 26: SDK Implementation

#### Phase 1: Package Setup

- [x] **Add dependencies** — `@arche-cms/types` (peer), `@arche-cms/schema` (dev, for type generation)
- [x] **Add `README.md`** — document API, usage examples, configuration
- [x] **Define package exports** — `src/index.ts` exports `createClient`, types, and utilities

#### Phase 2: HTTP Client Core

- [x] **Implement `createClient(config)` factory** — accepts `baseUrl`, `token?`, `fetch?` (custom fetch adapter), returns typed client
- [x] **Implement base HTTP methods** — `get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `delete<T>()` with JSON serialization, error handling, and auth header injection
- [x] **Implement error classes** — `ApiError` with `status`, `message`, `details` (validation errors), `code`
- [x] **Implement request/response interceptors** — `onRequest`, `onResponse`, `onError` hooks for logging, retry, token refresh

#### Phase 3: Typed Collection Client

- [x] **Implement collection client factory** — `collection<T>(slug)` returns `{ list, get, create, update, delete, bulkDelete, publish, unpublish, restore, versions, restoreVersion }`
- [x] **Type-safe list method** — `list(params?)` with `limit`, `offset`, `sort`, `filter`, `select`, `populate` query params; returns `{ data: T[], total: number, limit: number, offset: number }`
- [x] **Type-safe get method** — `get(id)` returns `T`
- [x] **Type-safe create method** — `create(data)` returns `T`
- [x] **Type-safe update method** — `update(id, data)` returns `T`
- [x] **Type-safe delete method** — `delete(id)` returns `{ success: boolean }`
- [x] **Type-safe bulk operations** — `bulkDelete(ids)`, `publish(id)`, `unpublish(id)`, `restore(id)`
- [x] **Type-safe version operations** — `versions(id)`, `restoreVersion(id, versionId)`

#### Phase 4: Global Client

- [x] **Implement global client factory** — `global<T>(slug)` returns `{ get, upsert }`
- [x] **Type-safe get** — `get()` returns `T`
- [x] **Type-safe upsert** — `upsert(data)` returns `T`

#### Phase 5: Auth & Media Clients

- [x] **Implement auth client** — `auth.login(email, password)`, `auth.register(email, password, name)`, `auth.refresh(refreshToken)`, `auth.forgotPassword(email)`, `auth.resetPassword(token, password)`, `auth.me()`
- [x] **Implement media client** — `media.list(params?)`, `media.get(id)`, `media.upload(file)`, `media.delete(id)`, `media.getFile(id)`
- [x] **Implement users client** — `users.list()`, `users.get(id)`, `users.create(data)`, `users.update(id, data)`, `users.delete(id)`
- [x] **Implement roles client** — `roles.list()`, `roles.get(id)`, `roles.create(data)`, `roles.update(id, data)`, `roles.delete(id)`

#### Phase 6: Code Generation Integration

- [x] **Update generators `sdk.ts`** — generate typed client code that imports from `@arche-cms/sdk` and provides collection-specific typed methods
- [x] **Generate collection types** — for each collection, generate an interface and a client accessor (e.g., `client.posts.list()` returns `Post[]`)
- [x] **Generate global types** — for each global, generate an interface and a client accessor (e.g., `client.siteSettings.get()` returns `SiteSettings`)
- [x] **Update `cms generate`** — add `--sdk` flag to generate the typed SDK client file

#### Phase 7: Testing

- [x] **Unit tests for HTTP client** — request/response handling, error classes, auth headers, interceptors
- [x] **Unit tests for collection client** — typed methods, query param serialization, response parsing
- [x] **Unit tests for global client** — typed methods
- [x] **Unit tests for auth client** — login, register, refresh, forgot/reset password
- [x] **Unit tests for media client** — upload, list, get, delete
- [x] **Integration tests** — mock fetch, verify full request lifecycle
- [x] **Type tests** — verify type inference with `expectTypeOf` (TypeScript type-level tests)

#### Phase 8: Documentation & Polish

- [x] **Write README** — installation, quick start, configuration, API reference, examples
- [x] **Add JSDoc comments** — all public methods and types
- [x] **Add CHANGELOG entry** — v0.2.0 with SDK release

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all tests pass (existing + new SDK tests)
- [x] Run `pnpm build` — all packages build successfully
- [x] Verify SDK imports work: `import { createClient } from "@arche-cms/sdk"`
- [x] Verify generated SDK types compile against real schema definitions

---

## Milestone 27: Test Coverage to 100%

### Objective

Achieve 100% test coverage across all 17 packages. Current baseline: 243 tests, ~80% coverage. Key gaps in CMS server routes, admin UI components, storage adapters, and edge cases.

### Coverage Audit

- [x] **Run `pnpm test -- --coverage`** — generate coverage reports for all packages, identify files below 80%
- [x] **Identify uncovered lines** — list files/functions with <80% coverage per package

### CMS Server Routes (`packages/cms/src/server/routes/`)

- [x] **`collections.ts`** — add tests for: bulk delete, publish/unpublish, restore, version list, version restore, localized CRUD, soft delete filtering, field-level permission filtering
- [x] **`users.ts`** — add tests for: pagination, self-role escalation prevention, password hashing on update, duplicate email rejection
- [x] **`roles.ts`** — add tests for: pagination, role deletion with assigned users, permission update cascade
- [x] **`media.ts`** — add tests for: file size limit enforcement, MIME type validation, folder CRUD, pagination, rename
- [x] **`activity.ts`** — add tests for: filtered queries (collection, action), pagination, auth required
- [x] **`api-tokens.ts`** — add tests for: pagination, duplicate name rejection, token hash verification, last_used_at update
- [x] **`webhooks.ts`** — add tests for: pagination, HMAC signature verification, retry with backoff, delivery status tracking
- [x] **`schemas.ts`** — add tests for: schema save/load, slug path traversal rejection, component/global schema CRUD

### CMS Server Plugins (`packages/cms/src/server/plugins/`)

- [x] **`auth.ts`** — add tests for: JWT + API key fallback, expired token rejection, missing token handling
- [x] **`swagger.ts`** — add tests for: security schemes, public route exclusion, server URL config
- [x] **`error-handler.ts`** — add tests for: 413 payload too large, malformed JSON, unique constraint errors, validation errors

### CMS Server Lib (`packages/cms/src/server/lib/`)

- [x] **`activity.ts`** — add tests for: recordActivity with all action types, activity table auto-creation
- [x] **`webhooks.ts`** — add tests for: dispatchWebhooks, HMAC signing, retry logic, timeout handling
- [x] **`scheduled-publisher.ts`** — add tests for: interval scheduling, publish on due date, error recovery

### Storage Package (`packages/storage`)

- [x] **`local.ts`** — add tests for: path traversal prevention, missing directory creation, file metadata
- [x] **`s3.ts`** — add tests for: upload, delete, exists, getStream with mock S3 client
- [x] **`r2.ts`** — add tests for: upload, delete, exists, getStream with mock R2 client

### Database Package (`packages/database`)

- [x] **`sqlite.ts`** — add tests for: transaction rollback, connection close, getExistingSchema
- [x] **`postgres.ts`** — add tests for: connection pooling, transaction rollback, getExistingSchema
- [x] **`migration-generator.ts`** — add tests for: complex type columns (JSONB), localized field fallback

### Auth Package (`packages/auth`)

- [x] **`service.ts`** — add tests for: password reset token expiry, refresh token rotation, concurrent login
- [x] **`jwt.ts`** — add tests for: token expiry, invalid secret, malformed token

### Permissions Package (`packages/permissions`)

- [x] **`access-control.ts`** — add tests for: nested resource permissions, field-level read/write, role hierarchy

### Generators Package (`packages/generators`)

- [x] **`sdk.ts`** — add tests for: complex type generation, component nested types, global types
- [x] **`admin-forms.ts`** — add tests for: all 29 field type mappings
- [x] **`openapi.ts`** — add tests for: all field type OpenAPI schemas, error response schemas

### REST API Package (`packages/rest-api`)

- [x] **`handlers.ts`** — add tests for: soft delete filtering, field-level permissions, locale switching
- [x] **`route-generator.ts`** — add tests for: middleware hooks on all handler types, global routes
- [x] **`openapi.ts`** — add tests for: request body schemas, error schemas, security schemes

### GraphQL Package (`packages/graphql`)

- [x] **`type-defs.ts`** — add tests for: global types, Connection types, component refs
- [x] **`resolvers.ts`** — add tests for: global query/mutation resolvers, pagination, validation errors

### Validation Package (`packages/validation`)

- [x] **`generator.ts`** — add tests for: localized fields, custom validation, combined validators, create/update variants

### Schema Package (`packages/schema`)

- [x] **`loader.ts`** — add tests for: malformed files, missing imports, circular references
- [x] **`validator.ts`** — add tests for: all validation rules, edge cases (empty slug, special chars)
- [x] **`watcher.ts`** — add tests for: rapid changes, stop/start cycle, non-schema file filtering

### Core Package (`packages/core`)

- [x] **`container.ts`** — add tests for: singleton registration, async resolution, circular dependency detection
- [x] **`event-bus.ts`** — add tests for: middleware ordering, async event handling, error propagation

### CLI Package (`packages/cms`)

- [x] **`commands/*.ts`** — add tests for: all CLI commands with mocked dependencies
- [x] **`index.ts`** — add tests for: argument parsing, command dispatch, help output

### Create-App Package (`packages/create-app`)

- [x] **`scaffold.ts`** — add tests for: all scaffold options, Dockerfile generation, .dockerignore generation

### Admin UI (`packages/cms/admin`)

- [x] **`components/field-input.tsx`** — add tests for: all 29 field type renderers, validation error display
- [x] **`components/sidebar.tsx`** — add tests for: navigation rendering, collection/global listing
- [x] **`components/command-palette.tsx`** — add tests for: search filtering, keyboard navigation
- [x] **`lib/hooks.ts`** — add tests for: all TanStack Query hooks with mocked fetch
- [x] **`lib/api.ts`** — add tests for: all API client functions with mocked fetch

### Verification

- [x] Run `pnpm test -- --coverage` — all packages at 100% line coverage
- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm build` — all packages build successfully

---

## Milestone 28: Docs Site Update (`apps/docs/`)

### Objective

Update the VitePress documentation site to reflect all changes from M23–M27: removed packages, new features, corrected counts, and complete API reference.

### Homepage (`apps/docs/index.md`)

- [x] **Update feature cards** — added TanStack Query mention, API tokens, webhooks, settings page, create-app scaffolding
- [x] **Update Admin UI description** — mention TanStack Router + TanStack Query + pagination + 404 page + forgot password

### Guide — Introduction (`apps/docs/guide/introduction.md`)

- [x] **Fix field count** — change "30 field types" to "29 field types"
- [x] **Add TanStack Query** to tech stack list
- [x] **Update Admin UI features** — add settings page, API tokens, webhooks, forgot password, 404 page, pagination

### Guide — Getting Started (`apps/docs/guide/getting-started.md`)

- [x] **Add `create-app` package** to project structure
- [x] **Fix clone path** — change `cd cms` to `cd arche-cms`
- [x] **Fix port description** — clarify dev vs production admin URL

### Guide — Field Types (`apps/docs/guide/field-types.md`)

- [x] **Fix field count** — change "30 field types" to "29 field types"
- [x] **Remove `image` field** — not exported from @arche-cms/schema

### Guide — Architecture (`apps/docs/guide/architecture.md`)

- [x] **Add missing packages** — `create-app`, `generators`, `validation`, `sdk` to diagram and package table
- [x] **Add TanStack Query** to Admin UI description

### Guide — CLI Usage (`apps/docs/guide/cli-usage.md`)

- [x] **Add `cms start` command** to commands table
- [x] **Add `--vite` flag** to `cms dev` documentation
- [x] **Add missing flags** — `--port`, `--host`, `--db-url`, `--db-adapter`

### Guide — Deployment (`apps/docs/guide/deployment.md`)

- [x] **Fix port inconsistency** — standardize on port 3000
- [x] **Update Dockerfile section** — reference `create-app` generated Dockerfile (node:24-alpine, multi-stage)

### Guide — Schemas (`apps/docs/guide/schemas.md`)

- [x] **Fix `image` field** — changed to `media`

### Guide — Contributing (`apps/docs/contributing.md`)

- [x] **Fix package manager** — change `yarn` to `pnpm` throughout

### Changelog (`apps/docs/changelog.md`)

- [x] **Fix field count** — "30" → "29"
- [x] **Add missing features** — API tokens, webhooks, settings sub-routes, create-app, Docker generation, TanStack Query, pagination, 404 page, forgot password
- [x] **Add missing CLI commands** — `cms collection create`, `cms plugin create`
- [x] **Fix DB support list** — add MySQL, Turso, Cloudflare D1 as planned

### Reference — API (`apps/docs/reference/api.md`)

- [x] **Add missing query params** — `locale`, `deleted`, `select`, `populate`
- [x] **Add pagination metadata** — `total`, `limit`, `offset` in response
- [x] **Add globals endpoints** — `GET/PUT /api/globals/:slug`
- [x] **Add media endpoints** — upload, list, get, delete, folders
- [x] **Add auth endpoints** — login, register, refresh, forgot-password, reset-password
- [x] **Add settings endpoints** — API tokens, webhooks, users, roles, activity
- [x] **Add publish/unpublish/restore endpoints**
- [x] **Add version history endpoints**

### Reference — GraphQL (`apps/docs/reference/graphql.md`)

- [x] **Add globals** — document global types, queries, mutations (M24)
- [x] **Fix query names** — `posts(...)` → `listPosts(filter, sort, limit, offset)`
- [x] **Add Connection type** — `{ data: [Post], total, limit, offset }`

### Reference — SDK (`apps/docs/reference/sdk.md`)

- [x] **Update to reflect implementation** — full API reference for createClient, collection, global, auth, media, users, roles clients
- [x] **Add error handling examples** — ApiError class with status, message, details

### VitePress Config (`apps/docs/.vitepress/config.ts`)

- [x] **Remove dead sidebar links** — removed `/reference/schema` and `/reference/plugin-api`
- [x] **Verify sidebar** — only valid links remain

### Verification

- [x] Run `pnpm --filter @arche-cms/docs build` — docs site builds without errors
- [x] Verify all sidebar links resolve to existing pages
- [x] Verify no broken internal links

---

## Milestone 29: Docs Files Update (`docs/`)

### Objective

Update the root-level documentation files to reflect all changes from M23–M27: corrected architecture, updated guides, accurate API docs, and current PRD.

### Architecture (`docs/architecture.md`)

- [x] **Fix monorepo layout** — replaced `cli/` with `cms/`, removed `admin/` and `api/` as separate apps, added `create-app/`, `validation/`, `sdk/`
- [x] **Fix package count** — updated to 17 packages with full table

### Contributing (`docs/contributing.md`)

- [x] **Add `create-app` package** to package table
- [x] **Fix package count** — updated table to reflect 17 packages
- [x] **Fix Node.js version** — changed from 20 to 22

### CLI Usage (`docs/cli-usage.md`)

- [x] **Fix package manager** — changed `yarn` to `pnpm`
- [x] **Add `cms start` command**
- [x] **Add `--vite` flag** to `cms dev`
- [x] **Add missing flags** — `--port`, `--host`, `--db-url`, `--db-adapter`

### Deployment (`docs/deployment.md`)

- [x] **Update Dockerfile example** — changed `node:20-alpine` to `node:24-alpine`, fixed multi-stage build
- [x] **Fix CMD** — changed `pnpm --filter @arche-cms/api-server start` to `npx cms start`
- [x] **Fix PM2 path** — changed `packages/cms/api/dist/index.js` to `npx cms start`
- [x] **Fix standalone path** — changed `node packages/cms/api/dist/index.js` to `npx cms start`

### API Documentation (`docs/api-documentation.md`)

- [x] **Fix filter format** — changed `filter={"status":"published"}` to `where[field]=value` query params
- [x] **Add pagination metadata** — `total`, `limit`, `offset` in response
- [x] **Add API token auth section** — documented `cms_<token>` bearer auth
- [x] **Add webhooks section** — documented webhook CRUD and events
- [x] **Add version history section** — documented version endpoints
- [x] **Add settings endpoints** — API tokens, webhooks, users, roles
- [x] **Add publish/unpublish/restore endpoints**

### PRD (`docs/PRD.md`)

- [x] **Fix field count** — "30" → "29"
- [x] **Update Post-MVP items** — moved draft/publish, version history, autosave, revisions, scheduled publishing, localization, soft delete, schema builder, plugin system to "Completed"
- [x] **Fix Milestone 5** — changed "React Router" to "TanStack Router + TanStack Query"
- [x] **Update Admin Panel features** — added settings page, API tokens, webhooks, forgot password, 404 page, pagination, TanStack Query
- [x] **Add create-app** — documented scaffolding tool
- [x] **Add TanStack Query** to tech stack

### Standalone Usage (`docs/standalone-usage.md`)

- [x] **Fix Dockerfile base image** — changed `node:22-alpine` to `node:24-alpine`

### Plugin Development (`docs/plugin-development.md`)

- [x] **Verified accuracy** — content is accurate, no changes needed

### BACKLOG (`docs/BACKLOG.md`)

- [x] **Update status** — marked completed items, added new future ideas from M23–M27

### Verification

- [x] Review all docs files for consistency
- [x] Verify no references to removed packages (admin-ui, builder)
- [x] Verify package counts are consistent (17 packages)
- [x] Verify port numbers are consistent (3000 for production, 5173 for dev)

---

## M30: v0.3.0 Release

- [x] Final review — ensure all M28–M29 docs changes are accurate
- [x] Update `CHANGELOG.md` with v0.3.0 section (M28, M29, docs overhaul)
- [x] Bump version to `0.3.0` in `packages/cms/package.json`
- [x] Tag release `v0.3.0`
- [x] Verify build, lint, typecheck, and tests pass before tagging

---

## M31: Test Coverage Push (94.97% → 100%)

- [x] Investigate `dev.ts:245` — find alternative testing approach for the infinite-hang guard (mock `fastify.listen` or split the function)
- [x] Add missing tests for `dev.ts` to cover the remaining 7.06% gap
- [x] Target 100% line coverage on CMS package (`packages/cms`)
- [x] Ensure total test count remains stable (1,354+)
- [x] Update vitest thresholds in `packages/cms/vitest.config.ts` to `lines: 100`, `functions: 100`, `branches: 100`, `statements: 100`

---

## M32: Admin UI Enhancements

- [x] **Version history UI** — page to browse document revisions, diff view, restore previous version
- [ ] **Localization UI** — language switcher in editor, side-by-side locale comparison, translation status indicators
- [x] **Media folder management** — create/rename/delete folders in media library, drag-and-drop organization
- [ ] **Dashboard widgets** — customizable admin dashboard with recent activity, drafts, scheduled content
- [x] **Bulk actions** — select multiple documents, bulk publish/unpublish/delete

---

## M33: SDK Code Generation Integration

- [x] Integrate typed SDK generation into `cms generate` command
- [x] Generate TypeScript client from collection/globals schemas
- [x] Generate typed hooks (`useCollection`, `useDocument`) for React frontend
- [x] Generate Zod validation schemas alongside SDK types
- [x] Output to configurable directory (default: `src/sdk/`)
- [x] Add `cms generate:types`, `cms generate:sdk`, `cms generate:validation` sub-commands

---

## M34: Comprehensive Playground E2E Tests (Complete)

### Status

Complete — 90 tests across 14 phases covering all API endpoints, error cases, edge cases, and cross-cutting concerns.
| Schemas | create, update, delete (write) | 0 |
| GraphQL | queries + mutations | 0 |
| Validation | invalid bodies, missing required fields, bad emails | 0 |
| Password Security | password excluded from responses | 0 |
| Pagination | limit, offset params | 0 |
| Search/Sort | filter, sort, select params | 0 |
| 404/Errors | non-existent entries, collections | 0 |

---

### Phase 1: Media Routes (~10 tests)

- [x] **POST /api/media creates a media record** — upload base64 data with fileName + mimeType, verify response
- [x] **GET /api/media lists uploaded media** — verify paginated response with `data` array and `total`
- [x] **GET /api/media/:id returns a single media record** — verify all fields present
- [x] **PATCH /api/media/:id updates metadata** — change `originalName` and `alt`, verify update
- [x] **DELETE /api/media/:id deletes a media record** — verify 200 and subsequent GET returns 404/null
- [x] **POST /api/media/folders creates a folder** — provide `name`, verify response
- [x] **GET /api/media/folders lists folders** — verify response structure
- [x] **PATCH /api/media/folders/:id renames a folder** — update `name`, verify
- [x] **DELETE /api/media/folders/:id deletes a folder** — verify 200
- [x] **POST /api/media rejects oversized files** — send >10MB base64 data, expect 413 or 400

### Phase 2: Bulk Operations & Draft Workflow (~10 tests)

- [x] **POST /api/posts/bulk-delete deletes multiple entries** — create 3 posts, bulk-delete 2, verify count
- [x] **POST /api/posts/:id/publish publishes a draft** — create post with `versions: { drafts: true }`, publish, verify `_status` changes
- [x] **POST /api/posts/:id/unpublish unpublishes a post** — publish then unpublish, verify status reverts
- [x] **POST /api/posts/bulk-publish publishes multiple drafts** — create 3 drafts, bulk-publish all
- [x] **POST /api/posts/bulk-unpublish unpublishes multiple posts** — publish 3, bulk-unpublish all
- [x] **POST /api/posts/:id/restore restores a soft-deleted entry** — create, delete (soft), restore, verify entry exists
- [x] **GET /api/posts/:id/versions lists version history** — create entry, update it twice, verify version list length >= 2
- [x] **POST /api/posts/:id/versions/:versionId/restore restores a previous version** — update entry, restore to v1, verify old data
- [x] **Soft-deleted entries excluded from list** — create with softDelete enabled, soft-delete, verify not in list
- [x] **Draft entries filtered correctly** — create with drafts enabled, verify `_status` field in list response

### Phase 3: Users & Roles (~10 tests)

- [x] **GET /api/users lists all users** — verify admin user present
- [x] **POST /api/users creates a new user** — provide email + password, verify 201
- [x] **GET /api/users/:id returns a user** — fetch admin user by ID
- [x] **PATCH /api/users/:id updates user email** — change email, verify update
- [x] **DELETE /api/users/:id deletes a user** — create user, delete, verify gone
- [x] **POST /api/roles creates a role** — provide name + permissions, verify 201
- [x] **GET /api/roles lists roles** — verify default admin role present
- [x] **GET /api/roles/:id returns a role** — fetch role by ID
- [x] **PATCH /api/roles/:id updates a role** — change name, verify
- [x] **DELETE /api/roles/:id deletes a role** — create role, delete, verify gone

### Phase 4: Activity, API Tokens & Webhooks (~10 tests)

- [x] **GET /api/activity lists activity** — perform a create, then verify activity recorded
- [x] **GET /api/activity filters by action** — create + delete entries, filter by `action=create`
- [x] **GET /api/activity filters by collection** — filter by `collection=posts`
- [x] **POST /api/settings/api-tokens creates a token** — verify raw token returned once, `last_four` stored
- [x] **GET /api/settings/api-tokens lists tokens** — verify token metadata without raw value
- [x] **DELETE /api/settings/api-tokens/:id revokes a token** — verify removed from list
- [x] **POST /api/settings/webhooks creates a webhook** — provide name, url, events, verify 201
- [x] **GET /api/settings/webhooks lists webhooks** — verify response
- [x] **PUT /api/settings/webhooks/:id updates a webhook** — change URL, verify
- [x] **DELETE /api/settings/webhooks/:id deletes a webhook** — verify removed

### Phase 5: Schema Write Operations (~5 tests)

- [x] **POST /api/schemas/collection creates a collection schema** — provide slug + fields, verify 201
- [x] **PUT /api/schemas/collection/:slug updates a collection schema** — add a field, verify
- [x] **POST /api/schemas/global creates a global schema** — provide slug + fields
- [x] **DELETE /api/schemas/collection/:slug deletes a collection schema** — verify removed from list
- [x] **POST /api/schemas rejects invalid slug** — provide numeric-starting slug, expect 400

### Phase 6: GraphQL (~8 tests)

- [x] **POST /graphql executes listPosts query** — verify data array returned
- [x] **POST /graphql executes getPost query** — create post via REST, query via GraphQL
- [x] **POST /graphql executes createPost mutation** — verify created post returned
- [x] **POST /graphql executes updatePost mutation** — create then update, verify
- [x] **POST /graphql executes deletePost mutation** — create then delete, verify
- [x] **POST /graphql returns validation errors for invalid input** — send missing required fields
- [x] **GET /graphiql returns the GraphiQL IDE** — verify 200 and HTML response
- [x] **POST /graphql rejects unauthenticated requests** — no token, expect 401

### Phase 7: Validation & Error Cases (~10 tests)

- [x] **POST /api/posts rejects missing required fields** — omit `title`, expect 400
- [x] **POST /api/posts rejects invalid body** — send malformed JSON or wrong types
- [x] **GET /api/posts/:id returns 404 for non-existent ID** — use fake UUID
- [x] **PATCH /api/posts/:id returns 404 for non-existent ID** — use fake UUID
- [x] **DELETE /api/posts/:id returns 404 for non-existent ID** — use fake UUID
- [x] **POST /api/auth/register rejects short password** — send password < 8 chars, expect 400
- [x] **POST /api/auth/register rejects invalid email** — send "not-an-email", expect 400
- [x] **POST /api/auth/login rejects wrong password** — expect 401
- [x] **POST /api/auth/login rejects non-existent user** — expect 401
- [x] **Password field excluded from user responses** — register user, verify no `password` or `passwordHash` in response

### Phase 8: Query Parameters (~7 tests)

- [x] **GET /api/posts?limit=2 returns paginated results** — create 5 posts, request limit=2, verify data length
- [x] **GET /api/posts?offset=2 skips entries** — create 5 posts, offset=2, verify first item
- [x] **GET /api/posts?sort=title:asc sorts ascending** — create posts with different titles, verify order
- [x] **GET /api/posts?sort=title:desc sorts descending** — verify reverse order
- [x] **GET /api/posts?select=title,slug selects specific fields** — verify only requested fields returned
- [x] **GET /api/posts?where[status]=draft filters by field** — create draft + published, filter
- [x] **GET /api/settings/api-tokens?limit=1 paginates tokens** — create 3 tokens, verify limit

### Phase 9: Metadata Endpoints (~3 tests)

- [x] **GET /api/collections returns collection metadata** — verify slug, fields, labels for each
- [x] **GET /api/globals returns global metadata** — verify slug, fields, label for each
- [x] **GET /api/plugins returns plugin list** — verify array response

---

### Verification

- [x] Run `pnpm --filter @arche-cms/playground test` — all 90 tests pass
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm lint` — no lint errors
- [x] Verify test count increased from baseline (27 → 90)

---

## M35: Admin UI Visual Overhaul & Accessibility

### Objective

Comprehensive UI/UX polish of the admin panel. Improve visual hierarchy, accessibility (WCAG 2.1 AA), consistency, and modern aesthetics while preserving all existing functionality. Introduce missing reusable primitives, unify design tokens, and fix every accessibility violation identified in the codebase audit.

**Constraints:** No changes to APIs, state management, business logic, data flows, or user workflows. Small, incremental improvements. Follow existing conventions (shadcn/ui patterns, Tailwind v4, TanStack Router).

---

### Phase 1: Design System Foundation — Reusable UI Primitives

Add missing shadcn/ui components that are currently hand-rolled inline across 30+ files. Each new primitive eliminates duplicated Tailwind classes and ensures consistent theming.

- [x] **Add `Badge` component** (`components/ui/badge.tsx`) — variant-based (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `info`). Replaces hand-rolled status badges in `collections/$slug.tsx`, `settings/plugins.tsx`, `settings/webhooks/index.tsx`, `settings/api-tokens.tsx` (5+ files)
- [x] **Add `Card` component** (`components/ui/card.tsx`) — `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Replaces `rounded-lg border p-4` pattern used in dashboard, collections list, globals list, settings plugins, auth pages (10+ files)
- [x] **Add `Select` component** (`components/ui/select.tsx`) — accessible dropdown using Radix UI Select. Replaces raw `<select>` elements in collection entry list (locale), settings users (role), settings roles (actions/resources), webhooks (events), schema builder (field types) (8+ files)
- [x] **Add `Dialog` / `AlertDialog` component** (`components/ui/dialog.tsx`) — accessible modal with focus trap, Escape key, backdrop click, `role="dialog"`, `aria-modal`. Replaces custom `ConfirmDialog` (8 files) and command palette overlay
- [x] **Add `Checkbox` component** (`components/ui/checkbox.tsx`) — accessible checkbox with label association. Replaces raw `<input type="checkbox">` in webhook events, bulk actions, schema builder (6+ files)
- [x] **Add `Switch` component** (`components/ui/switch.tsx`) — toggle switch for boolean settings. Replaces badge-styled toggle buttons in webhooks enable/disable
- [x] **Add `Tooltip` component** (`components/ui/tooltip.tsx`) — hover tooltip for truncated text, icon-only buttons. Needed for collapsed sidebar nav items and truncated URLs
- [x] **Add `Separator` component** (`components/ui/separator.tsx`) — `<hr>` alternative using `border` token. Replaces `border-b` dividers
- [x] **Add `Avatar` component** (`components/ui/avatar.tsx`) — user avatar with fallback initials. Replaces plain email text in users list and header
- [x] **Add `Alert` / `AlertBanner` component** (`components/ui/alert.tsx`) — semantic error/success/info banners. Replaces hand-rolled `bg-destructive/10 p-3 text-destructive` patterns (8+ files with inconsistent padding)
- [x] **Add `Skeleton` to `ui/` directory** — move existing `skeleton.tsx` from `components/` into `components/ui/` for consistency with other primitives
- [x] **Add `Tabs` component** (`components/ui/tabs.tsx`) — accessible tab navigation. Replaces hand-rolled tab UI in `field-input.tsx` TabsInput

---

### Phase 2: Accessibility (WCAG 2.1 AA) — Critical Violations

Fix all accessibility violations that would fail a WCAG audit. These are legal compliance issues for many organizations.

- [x] **Add `aria-label` to all icon-only buttons** — `header.tsx` (hamburger, logout, search), `sidebar.tsx` (collapse toggle), `field-input.tsx` (toolbar buttons), `media/index.tsx` (edit/delete on thumbnails), `pagination.tsx` (prev/next). Affects 20+ locations
- [x] **Add focus trap to `ConfirmDialog`** — trap Tab key inside modal, restore focus on close, add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape key handler, backdrop click to close
- [x] **Add focus trap to `CommandPalette`** — same treatment as ConfirmDialog. Currently focus escapes to background content behind overlay
- [x] **Add `aria-current="page"` to active sidebar nav items** — `sidebar.tsx` active state currently uses visual-only `bg-sidebar-accent`; add ARIA attribute for screen readers
- [x] **Add `aria-label` to pagination buttons** — "Page 1", "Page 2", etc. for page number buttons; "Previous page" / "Next page" for nav buttons
- [x] **Link error messages to inputs via `aria-describedby`** — all form fields in `field-input.tsx`, `login.tsx`, `register.tsx`, `reset-password.tsx`, settings forms. Error `<p>` tags need `id` and inputs need `aria-describedby={errorId}`
- [x] **Add `aria-live="polite"` to toast container** — `toast-provider.tsx` container should announce new toasts to screen readers
- [x] **Add `role="status"` or `aria-live` to status badges** — published/draft status indicators should announce state
- [x] **Add `autocomplete` attributes to auth forms** — `autocomplete="email"` on email inputs, `autocomplete="current-password"` on login, `autocomplete="new-password"` on register/reset
- [x] **Fix `/reset-password` missing from `PUBLIC_PATHS`** — `__root.tsx:15` — unauthenticated users clicking reset links are redirected to login before the form loads. Bug
- [x] **Add `aria-label` to locale selector** — `collections/$slug.tsx` and `new.$slug.tsx` raw `<select>` elements have no label
- [x] **Add `role="switch"` and `aria-pressed` to webhook/plugin toggles** — `settings/webhooks/index.tsx` and `settings/plugins.tsx` toggle buttons visually look like badges but behave as toggles
- [x] **Add skip-to-content link** — `__root.tsx` should render a visually-hidden "Skip to main content" link that becomes visible on focus, linking to the main content area
- [x] **Add `aria-label` to settings sidebar nav** — `settings/index.tsx` `<nav>` element lacks `aria-label="Settings"`

---

### Phase 3: Visual Consistency — Design Tokens & Color Unification

Replace all hardcoded Tailwind color classes with semantic design tokens. Unify spacing, border radius, and shadows across the UI.

- [x] **Replace hardcoded status badge colors with `Badge` variants** — `collections/$slug.tsx` lines 507-530 use `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400` etc. Replace with `<Badge variant="success">`, `<Badge variant="warning">`, `<Badge variant="info">`. Also fix `dark:dark:bg-gray-800` double-prefix bug on line 529
- [x] **Replace hardcoded success/error colors in auth pages** — `reset-password.tsx` uses `bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400` while `forgot-password.tsx` uses `bg-success/10 text-success`. Unify to use `Alert variant="success"` component
- [x] **Replace hardcoded plugin/webhook status colors** — `settings/plugins.tsx` uses `bg-green-100 text-green-700` without dark mode variants. `settings/webhooks/index.tsx` same issue. Replace with `<Badge variant="success">` / `<Badge variant="secondary">`
- [x] **Unify error banner styling** — currently `p-3 text-sm` (login), `p-4` (dashboard), `p-3 text-sm` (auth pages). Standardize to `Alert` component with consistent padding
- [x] **Unify card styling** — dashboard stat cards, collection cards, globals cards, auth form cards all use slightly different `rounded-lg border` patterns. Replace with `<Card>` component
- [x] **Standardize heading typography** — some pages use `text-3xl` (collections index), others `text-2xl md:text-3xl` (dashboard, settings). Pick one pattern and apply consistently: `text-2xl font-bold tracking-tight md:text-3xl`
- [x] **Standardize page spacing** — most pages use `space-y-6` but some use `space-y-4` or `space-y-8`. Standardize to `space-y-6` for page-level spacing, `space-y-4` for form sections
- [x] **Standardize form card padding** — `rounded-lg border p-6` in create/edit forms vs `rounded-lg border p-4` in list items. Keep both but make them consistent within their category
- [x] **Add consistent `shadow-sm` or `shadow-md` to elevated elements** — modals, dropdowns, and toast notifications should use the same shadow scale
- [x] **Standardize border radius** — ensure all cards, badges, inputs, and buttons use the design system `--radius` variable (currently `0.5rem`). Remove any hardcoded `rounded-lg` vs `rounded-md` inconsistencies

---

### Phase 4: Interactive States & Micro-interactions

Improve hover, focus, active, and disabled states across all interactive elements. Add subtle animations for state transitions.

- [x] **Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to all interactive elements** — buttons, inputs, selects, links. Currently only `Button` and `Input` components have focus rings; raw `<select>`, `<a>`, checkbox, toggle buttons do not
- [x] **Add hover effects to dashboard stat cards** — currently static divs. Add `hover:bg-accent/50 hover:shadow-sm transition-all cursor-pointer` and wrap in `<Link>` to navigate to the respective list view
- [x] **Add hover effects to collection/globals list cards** — globals already have `hover:bg-accent` and arrow slide animation; ensure collections match
- [x] **Add loading spinner to form submit buttons** — when saving, show a small spinner inside the button instead of just disabling it. Affects: all create/edit forms (12+ locations)
- [x] **Improve confirm dialog animation** — add `animate-in fade-in-0 zoom-in-95` enter animation and `animate-out fade-out-0 zoom-out-95` exit animation (matching shadcn Dialog pattern)
- [x] **Improve toast exit animation** — `toast-provider.tsx` currently removes toasts abruptly after 4s. Add `animate-out slide-in-from-right` exit animation before removal
- [x] **Extend toast timeout for errors** — error toasts should persist for 8 seconds (vs 4s for success/info) to give users time to read them
- [x] **Add `transition-colors` to all clickable elements** — ensure smooth color transitions on hover/active for nav items, buttons, links, list items
- [x] **Improve sidebar collapse animation** — current `transition-all duration-200` is fine; add smooth width transition for child content fade-out when collapsing
- [x] **Add `active:scale-[0.98]` to primary action buttons** — subtle press effect on "Save", "Create", "Delete" buttons for tactile feedback

---

### Phase 5: Responsive Design & Mobile UX

Fix responsive layout issues identified in the audit. Ensure usable experience on tablet (768px) and mobile (375px).

- [x] **Make settings sidebar responsive** — `settings/index.tsx` `w-48` sidebar does not collapse on mobile. Add: on mobile, render as horizontal scrollable tabs or a dropdown select instead of fixed sidebar
- [x] **Improve mobile header** — `header.tsx` hamburger menu works but search button disappears on mobile (`hidden md:inline` on email). Ensure all essential actions (search, theme toggle, logout) remain accessible on mobile
- [x] **Improve mobile table scrolling** — `collections/$slug.tsx` uses `min-w-[500px] overflow-x-auto`. On mobile, the action column may be hidden. Add sticky last column or horizontal scroll indicator
- [x] **Improve media library grid on very small screens** — currently `grid-cols-2` on mobile. On 375px screens, 2 columns with `gap-4` gives ~165px per item which is tight. Consider `grid-cols-1` below 400px
- [x] **Improve schema editor on tablet** — `schemas/$type.$slug.tsx` two-column layout (`lg:grid-cols-2`) collapses to single column below `lg`. On tablet (768-1024px), the field settings panel appears below the field list requiring scroll. Consider sticky positioning for the settings panel
- [x] **Improve auth forms on mobile** — login/register forms use `max-w-sm` which is fine, but ensure `px-4` padding prevents edge-to-edge content on small screens
- [x] **Test and fix any overflow issues** — ensure no horizontal scrollbar on any page at 375px viewport width (except data tables which intentionally scroll)

---

### Phase 6: Typography & Readability

Modernize typography scale, improve readability, and ensure accessible font sizes.

- [x] **Increase minimum font size to 12px** — `schemas/$type.$slug.tsx` uses `text-[9px]` and `text-[10px]` throughout the field editor. Replace with `text-xs` (12px) minimum. WCAG recommends minimum 12px for readable text
- [x] **Standardize font size scale** — establish and document: `text-xs` (12px) for labels/badges, `text-sm` (14px) for body/inputs, `text-base` (16px) for headings, `text-lg` (18px) for page titles, `text-2xl` (24px) for hero headings
- [x] **Improve line height for body text** — ensure `leading-normal` (1.5) or `leading-relaxed` (1.625) for paragraph text. Some areas use `leading-tight` (1.25) which is too dense for body copy
- [x] **Improve table header typography** — `text-sm font-medium text-muted-foreground` is good; ensure consistent across all table views
- [x] **Improve empty state typography** — empty states should have a clear heading (`text-lg font-semibold`) and description (`text-sm text-muted-foreground`) with consistent spacing
- [x] **Add `tracking-tight` to page headings** — large headings (`text-2xl` and above) benefit from tighter letter spacing for a modern look

---

### Phase 7: Component Decomposition & Code Quality

Break down oversized components for maintainability. This phase does not change visuals but makes future changes easier.

- [x] **Extract `MediaLibrary` sub-components** — `media/index.tsx` (645→377 lines) into: `MediaLoadingSkeleton`, `MediaHeader`, `BreadcrumbNav`, `FolderCard`, `MediaCard`, `UploadOverlay`, `NewFolderInput`, `EmptyState` in `media/components/`
- [x] **Extract `SchemaEditor` sub-components** — `schemas/$type.$slug.tsx` (1574→1393 lines) into: `field-config.ts` (FIELD_TYPE_CONFIG, FIELD_TYPE_GROUPS, defaultField, getFieldConfig), `FieldTypePicker`, `SchemaLoadingSkeleton` in `schemas/components/`
- [x] **Extract `FieldInput` sub-components** — `field-input.tsx` (1409→131 lines, 91% reduction) into `field-types/`: `field-helpers.tsx` (FieldLabel, FieldError, mapInputType, getOptions), `basic-inputs.tsx`, `text-inputs.tsx`, `media-inputs.tsx`, `structure-inputs.tsx`
- [x] **Remove duplicate `BooleanInput`/`CheckboxInput`** — merged into single `BooleanInput` that handles both `boolean` and `checkbox` field types
- [x] **Extract locale selector into shared component** — `LocaleSelector.tsx` replaces duplicated `<select>` markup in `collections/$slug.tsx`, `new.$slug.tsx`, `$id_.$slug.edit.tsx`
- [x] **Extract `renderActions` into `EntryActions` component** — `collections/$slug.tsx` standalone function (47 lines, 7 params) → `components/entry-actions.tsx` with typed props

---

### Phase 8: Dark Mode & Theme Polish

Fix dark mode inconsistencies and ensure all elements look polished in both themes.

- [x] **Audit all hardcoded `dark:` classes** — search for `dark:bg-green-*`, `dark:text-green-*`, `dark:bg-amber-*`, etc. Replace with design token equivalents or Badge/Alert component variants that handle dark mode internally
- [x] **Fix theme provider `storageKey` mismatch** — `main.tsx` passes `storageKey="cms-theme"` but `theme-provider.tsx` default is `"vite-ui-theme"`. The main.tsx override works but the provider should use `"cms-theme"` as its default
- [x] **Add system theme listener** — `theme-provider.tsx` sets theme class once on mount but does not listen for `prefers-color-scheme` changes. Add `matchMedia("(prefers-color-scheme: dark)")` listener when theme is "system"
- [x] **Fix sidebar section header contrast** — `text-sidebar-foreground/50` (50% opacity) may not meet 4.5:1 contrast ratio on dark sidebar background. Increase to `/70` or use a lighter color token
- [x] **Ensure all borders are visible in dark mode** — `border-border` token resolves to `hsl(217.2 32.6% 17.5%)` in dark mode. Verify this is visible against `hsl(222.2 84% 4.9%)` background (both are very dark). May need to lighten the dark border
- [x] **Test all modals/overlays in dark mode** — confirm dialogs, command palette, toast notifications should have appropriate contrast and shadow in dark mode

---

### Phase 9: Form UX Improvements

Make forms easier to scan and complete without changing form structure or validation logic.

- [x] **Add "show/hide password" toggle to auth forms** — `login.tsx`, `register.tsx`, `reset-password.tsx`, `settings/users/new.tsx`, `settings/users/$id.tsx`. Add eye/eye-off icon button inside password input
- [x] **Add password confirmation to register form** — register form no longer exists; all admin users are added through the admin panel settings page
- [x] **Add form-level error summary** — when a form submission fails with validation errors, show a summary banner at the top listing all errors with links to the relevant fields (in addition to inline errors)
- [x] **Add unsaved changes warning** — `collections/new.$slug.tsx`, `collections/$id_.$slug.edit.tsx`, `globals/$slug.tsx`, settings edit forms. Use `beforeunload` event and TanStack Router `beforeRouteLeave` to warn when navigating away with dirty form state
- [x] **Add `placeholder` text to all form inputs** — audit all `<Input>` usages and ensure meaningful placeholder text where helpful (e.g., "Enter email address", "Search...")
- [x] **Improve select input styling** — all raw `<select>` elements should match the `Input` component's height (`h-9`), border, and focus ring. After Phase 1 adds the `Select` component, migrate all raw selects

---

### Phase 10: Loading States & Empty States

Improve perceived performance and provide helpful guidance when content is empty.

- [x] **Replace "Loading..." text with skeleton screens** — `__root.tsx` line 75 shows plain "Loading..." on initial app load. Replace with a layout skeleton that mimics the sidebar + header + content structure
- [x] **Add skeleton loading to all list pages** — collections, globals, users, roles, webhooks, API tokens, plugins. Currently some show skeletons, others show nothing. Standardize: 3-5 skeleton rows matching the table layout
- [x] **Add image placeholders in media library** — `media/index.tsx` uses `loading="lazy"` but no placeholder. Add a muted background or skeleton while images load
- [x] **Improve empty states with icons and CTAs** — all empty states should have: an icon (matching the content type), a heading ("No items yet"), a description ("Create your first..."), and a CTA button. Currently some have icons, some don't. Standardize across: collections list, globals list, media library, users, roles, webhooks, API tokens, activity
- [x] **Add search/filter empty states** — when a search or filter returns no results, show "No results found for [query]" instead of the generic empty state

---

### Verification

- [x] Run `pnpm lint` — no new errors
- [x] Run `pnpm typecheck` — no type errors
- [x] Run `pnpm test` — all tests pass (no regressions)
- [x] Run `pnpm build` — all packages build successfully
- [x] Admin panel builds successfully (Vite build)
- [x] Manual: verify all pages render correctly in light and dark mode
- [x] Manual: verify keyboard navigation works on all interactive elements (Tab, Enter, Escape, Arrow keys)
- [x] Manual: verify screen reader announces all interactive elements correctly (VoiceOver on macOS)
- [x] Manual: verify responsive layout at 375px, 768px, 1024px, 1440px viewport widths
- [x] Manual: verify all form submissions show loading states and success/error feedback
- [x] Manual: verify confirm dialogs trap focus and close on Escape
- [x] Run axe DevTools or Lighthouse accessibility audit — target score > 90

---

## M36: Firebase-Backed CMS MVP Variant

### Objective

Build an MVP variant of the CMS that uses Firebase directly (Auth + Firestore + Storage) without depending on the current Fastify REST/GraphQL API. Implementation lives in a new **`packages/cms-firebase/`** package (`@arche-cms/cms-firebase`), keeping `packages/cms/` untouched.

### Scope

**Include:** login/logout, current-user session, collection/global CRUD, media upload + listing, basic role gating, dashboard/read pages needed by admin navigation.

**Exclude for MVP:** API tokens, runtime schema write/edit in browser, server webhooks dispatch/retries, scheduled publishing workers, GraphQL endpoint.

### Package Strategy

- New package: `packages/cms-firebase/` — contains all Firebase provider implementations, Firebase config, security rules templates
- `packages/admin-ui/` — will consume the Firebase provider via a provider boundary (context/factory pattern)
- `packages/cms/` — **not modified** — remains the REST/GraphQL backend
- Firebase provider exports a conformant `AdminProvider` interface that the admin UI consumes

---

### Phase 1: Package Scaffolding

- [x] **Create `packages/cms-firebase/` directory** — `src/`, `test/`, `README.md`
- [x] **Create `packages/cms-firebase/package.json`** — name: `@arche-cms/cms-firebase`, version: `0.1.0`, type: `module`, exports: `{ ".": "./src/index.ts" }`, peerDependencies: `firebase`
- [x] **Create `packages/cms-firebase/tsconfig.json`** — extend `../../tsconfig.base.json`
- [x] **Add `packages/cms-firebase/` to `pnpm-workspace.yaml`** — covered by `packages/*` glob
- [x] **Install Firebase SDK** — `firebase` package as peer dependency in `packages/cms-firebase/`
- [x] **Create `packages/cms-firebase/src/index.ts`** — barrel exports

### Phase 2: Admin Backend Provider Boundary

#### Provider Contract (in `packages/admin-ui/`)

- [x] **Define `AdminProvider` interface** — `packages/admin-ui/src/lib/providers/types.ts` with methods:
  - Auth: `login(email, password)`, `register(email, password, name)`, `logout()`, `refreshToken()`, `getCurrentUser()`, `forgotPassword(email)`, `resetPassword(token, password)`
  - Collections: `listEntries(slug, params)`, `getEntry(slug, id, locale?)`, `createEntry(slug, data)`, `updateEntry(slug, id, data)`, `deleteEntry(slug, id)`, `bulkDelete(slug, ids)`, `publishEntry(slug, id)`, `unpublishEntry(slug, id)`, `restoreEntry(slug, id)`
  - Globals: `getGlobal(slug)`, `upsertGlobal(slug, data)`
  - Media: `listMedia(params)`, `getMedia(id)`, `uploadMedia(file)`, `deleteMedia(id)`, `getMediaFile(id)`, `listFolders()`, `createFolder(name)`, `renameFolder(id, name)`, `deleteFolder(id)`
  - Users: `listUsers(params)`, `getUser(id)`, `createUser(data)`, `updateUser(id, data)`, `deleteUser(id)`
  - Roles: `listRoles(params)`, `getRole(id)`, `createRole(data)`, `updateRole(id, data)`, `deleteRole(id)`
  - Settings: `listApiTokens()`, `createApiToken(data)`, `deleteApiToken(id)`, `listWebhooks()`, `getWebhook(id)`, `createWebhook(data)`, `updateWebhook(id, data)`, `deleteWebhook(id)`
  - Metadata: `listCollections()`, `listGlobals()`, `listPlugins()`, `getDashboardData(colSlugs)`
  - Activity: `listActivity(params)`

- [x] **Create `ProviderContext`** — React Context (`packages/admin-ui/src/lib/providers/context.tsx`) that provides the active provider to all components
- [x] **Create provider factory** — `packages/admin-ui/src/lib/providers/index.ts` that returns the correct provider based on `VITE_BACKEND_MODE`

#### REST Provider (Existing Behavior — in `packages/admin-ui/`)

- [x] **Create `RestProvider`** — `packages/admin-ui/src/lib/providers/rest.ts` implementing `AdminProvider`
- [x] **Move existing `apiFetch` calls** — refactor `lib/api.ts` functions into `RestProvider` methods
- [x] **Keep `lib/api.ts` as thin wrapper** — delegate to provider, maintain backward compatibility during migration
- [x] **Verify REST mode regression** — all existing tests pass, no behavior changes

#### Route Component Migration (in `packages/admin-ui/`)

- [x] **Migrate `routes/collections/$slug.tsx`** — replace direct `apiFetch` with provider methods via hooks
- [x] **Migrate `routes/collections/new.$slug.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/collections/$id_.$slug.edit.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/globals/$slug.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/index.tsx`** (Dashboard) — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/settings/index.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/settings/api-tokens.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/settings/webhooks/*`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/settings/users/*`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/settings/roles/*`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/settings/plugins.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/media/index.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/login.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/register.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/forgot-password.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `routes/reset-password.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `components/sidebar.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `components/command-palette.tsx`** — replace direct `apiFetch` with provider methods
- [x] **Migrate `components/field-input.tsx`** — replace RelationPicker and media upload `apiFetch` with provider methods

### Phase 3: Firebase Provider Implementation (in `packages/cms-firebase/`)

#### Firebase Auth

- [x] **Create Firebase config** — `packages/cms-firebase/src/config.ts` reading `VITE_FIREBASE_*` env vars
- [x] **Implement `FirebaseAuthProvider`** — `packages/cms-firebase/src/auth.ts`
  - Replace JWT refresh-cycle with Firebase Auth session listener (`onAuthStateChanged`)
  - `login(email, password)` → `signInWithEmailAndPassword`
  - `register(email, password, name)` → `createUserWithEmailAndPassword` + `updateProfile`
  - `logout()` → `signOut`
  - `getCurrentUser()` → Firebase Auth user with custom claims via `getIdTokenResult()`
  - `forgotPassword(email)` → `sendPasswordResetEmail`
  - `resetPassword(token, password)` → `confirmPasswordReset`
  - Token retrieval via `getIdToken()` for any Firestore/Storage operations
- [x] **Add Firebase Auth state to provider** — expose `user`, `loading`, `error` via React Context
- [x] **Update auth route guards** — check Firebase Auth state instead of JWT for protected routes

#### Firebase Firestore — Content

- [x] **Design Firestore data model** — Option A: one Firestore collection per CMS collection slug (recommended for MVP)
  - Document ID: entry ID (UUID)
  - Fields: all schema fields + `_status`, `_deletedAt`, `_version`, `createdAt`, `updatedAt`
  - Globals: single document per global slug in a `__cms_globals` collection
- [x] **Create Firestore content provider** — `packages/cms-firebase/src/content.ts`
  - `listEntries(slug, params)` → Firestore query with `where`, `orderBy`, `limit`, `offset`
  - `getEntry(slug, id)` → `getDoc(doc(db, slug, id))`
  - `createEntry(slug, data)` → `addDoc(collection(db, slug), data)`
  - `updateEntry(slug, id, data)` → `updateDoc(doc(db, slug, id), data)`
  - `deleteEntry(slug, id)` → soft delete (set `_deletedAt`) or hard delete based on collection config
  - `bulkDelete(slug, ids)` → atomic batch write
  - `publishEntry(slug, id)` → update `_status` to `"published"`
  - `unpublishEntry(slug, id)` → update `_status` to `"draft"`
  - `restoreEntry(slug, id)` → clear `_deletedAt`
- [x] **Implement Firestore query builder** — `packages/cms-firebase/src/query-builder.ts`
  - Map Arche filter syntax to Firestore `where` clauses (eq/ne/gt/gte/lt/lte/in/array-contains)
  - Handle pagination via `startAfter` cursor (not offset, for performance)
  - Handle sorting via `orderBy`
  - Handle field selection via `select` (limited in Firestore)
- [x] **Define Firestore indexes** — `firestore.indexes.json` for common query patterns:
  - `{collection}: _status + createdAt`
  - `{collection}: _status + _deletedAt + createdAt`
  - `{collection}: _status + updatedAt`
- [x] **Handle Firestore limitations** — document array-contains-any limits, compound query constraints, 1MB document limit

#### Firebase Firestore — Globals

- [x] **Implement global provider** — `packages/cms-firebase/src/globals.ts`
  - `getGlobal(slug)` → `getDoc(doc(db, "__cms_globals", slug))`
  - `upsertGlobal(slug, data)` → `setDoc(doc(db, "__cms_globals", slug), data, { merge: true })`

#### Firebase Storage — Media

- [x] **Create Firebase Storage provider** — `packages/cms-firebase/src/media.ts`
  - `uploadMedia(file)` → `uploadBytes(ref(storage, path), file)` + Firestore metadata record
  - `listMedia(params)` → Firestore query on `__cms_media` collection
  - `getMedia(id)` → Firestore doc + `getDownloadURL` for preview
  - `deleteMedia(id)` → `deleteObject(ref(storage, path))` + Firestore doc delete
  - `getMediaFile(id)` → `getDownloadURL(ref(storage, path))`
  - `listFolders()` → Firestore query on `__cms_media_folders`
  - `createFolder(name)` → `addDoc(collection(db, "__cms_media_folders"), { name })`
  - `renameFolder(id, name)` → `updateDoc`
  - `deleteFolder(id)` → `deleteDoc`
- [x] **Design storage path structure** — `media/{collection}/{entryId}/{filename}`
- [x] **Handle Firebase Storage security** — ensure uploads respect auth state

#### Firebase Firestore — Users & Roles

- [x] **Implement users provider** — `packages/cms-firebase/src/users.ts`
  - Map to Firestore `__cms_users` collection
  - Use Firebase Auth `customClaims` for role assignment
- [x] **Implement roles provider** — `packages/cms-firebase/src/roles.ts`
  - Map to Firestore `__cms_roles` collection
  - Store permissions as JSON document

#### Firebase — Settings (API Tokens, Webhooks)

- [x] **API Tokens** — Firestore CRUD for `__cms_api_tokens` collection via `FirestoreApiTokensProvider` (token generation, SHA-256 hashing, list/create/delete). Wired into `AdminProvider.settings` interface, REST and Firebase providers both implement it, admin UI hooks route through provider.
- [x] **Webhooks** — Firestore CRUD for `__cms_webhooks` collection via `FirestoreWebhooksProvider` (list/get/create/update/delete with full metadata). No server-side dispatch in Firebase mode. Wired into `AdminProvider.settings` interface, admin UI routes no longer blocked by `firebaseModeGuard`.

#### Firebase — Activity

- [x] **Implement activity provider** — `packages/cms-firebase/src/activity.ts`
  - Write audit events to Firestore `__cms_activity` collection on mutations
  - List activity with filters (collection, action)

#### Firebase Provider Entry Point

- [x] **Create `FirebaseProvider`** — `packages/cms-firebase/src/provider.ts` implementing `AdminProvider` from `packages/admin-ui`
- [x] **Export barrel** — `packages/cms-firebase/src/index.ts` exports `FirebaseProvider`, config, and individual providers

### Phase 4: RBAC & Security Rules (in `packages/cms-firebase/`)

- [x] **Define role model** — custom claims on Firebase Auth users (`role` field) + optional Firestore role documents
- [x] **Encode permission matrix** — Firestore Security Rules equivalent to `requirePermission` checks
- [x] **Write Firestore Security Rules** — `packages/cms-firebase/firestore.rules` file:
  - Allow reads only if authenticated and role matches permission
  - Allow writes only if authenticated and role matches permission
  - Deny unauthenticated access to all collections except public reads
- [x] **Write Storage Security Rules** — `packages/cms-firebase/storage.rules` file:
  - Allow uploads only if authenticated
  - Allow reads for authenticated users
  - Allow deletes only for admin/editor roles
- [x] **Add audit event writes** — Firestore writes for critical mutations (create/update/delete/publish) in `__cms_activity` via `wrapContentWithActivity()`

### Phase 5: Mode-Aware Admin UX (in `packages/admin-ui/`)

- [x] **Add `BackendMode` type** — `"rest" | "firebase"` union type in `packages/types/src/index.ts`
- [x] **Add backend mode config** — `VITE_BACKEND_MODE` env var (default `"rest"`) via `packages/admin-ui/src/lib/backend-mode.ts`
- [x] **Hide unsupported pages in Firebase mode** — API Tokens, Webhooks, Schema Builder (write), Settings → Plugins
- [x] **Update sidebar navigation** — conditionally show/hide items based on `VITE_BACKEND_MODE` + Firebase badge
- [x] **Update route guards** — prevent navigation to unsupported routes with redirect
- [x] **Update empty/error states** — explain Firebase-mode limitations (e.g., "Schema editing is not supported in Firebase mode")
- [x] **Add mode indicator** — show backend mode badge in admin sidebar header
- [x] **Update command palette** — filter actions based on mode
- [x] **Handle offline behavior** — Firebase supports offline persistence; show offline indicator

### Phase 6: Validation & Test Strategy

- [x] **Provider contract tests** — `packages/admin-ui/test/providers/contract.test.ts`
  - Test that both REST and Firebase providers implement the same `AdminProvider` interface
  - Verify UI-facing behavior matches expectations for each provider
- [x] **Firebase Emulator integration tests** — `packages/cms-firebase/test/`
  - Auth tests: login, register, logout, token refresh, password reset
  - Firestore tests: CRUD operations, queries, security rules
  - Storage tests: upload, download, delete, security rules
  - RBAC tests: permission enforcement via security rules
- [x] **Keep existing REST tests** — all 1,929 tests pass unchanged for REST mode
- [x] **Add mode-specific test suites** — separate Firebase test suite, only run when `FIREBASE_EMULATOR=true`
- [x] **Provider switching tests** — verify admin works correctly when switching modes

### Phase 7: Packaging & Rollout

- [x] **Update `@arche-cms/create-app`** — add `backend mode` question (`rest | firebase`, default `rest`) to scaffold prompts; write `VITE_BACKEND_MODE` to `.env` and include `@arche-cms/cms-firebase` in `package.json` dependencies when firebase is selected
- [x] **Create `apps/playground-firebase/`** — copy of `apps/playground/` using `@arche-cms/cms-firebase` as the backend provider; configured with Firebase emulator env vars; included in `pnpm-workspace.yaml` and `turbo.json`
- [x] **Ship `@arche-cms/cms-firebase` as experimental** — new package with explicit MVP capability matrix in README
- [x] **Add Firebase config docs** — required env vars, emulator/prod setup, index deployment (in README)
- [x] **Add `cms firebase:setup` CLI command** — interactive Firebase project setup wizard (in `packages/cms-firebase/`)
- [x] **Add `cms firebase:deploy-rules` CLI command** — deploy Firestore/Storage security rules
- [x] **Add `cms firebase:deploy-indexes` CLI command** — deploy Firestore indexes
- [x] **Add Firebase mode to create-app** — `@arche-cms/create-app` scaffold with Firebase option
- [x] **Write migration guide** — from REST mode to Firebase mode
- [x] **Document capability matrix** — what works in Firebase mode vs REST mode

### Firebase Data Model Summary

```
Firestore Collections:
  {collection-slug}         → One doc per entry (fields match schema + metadata)
  __cms_globals             → One doc per global slug
  __cms_users               → One doc per user (email, role, createdAt)
  __cms_roles               → One doc per role (name, permissions JSON)
  __cms_activity            → One doc per activity event
  __cms_media               → One doc per media file (metadata)
  __cms_media_folders       → One doc per folder
  __cms_api_tokens          → One doc per API token (hash, lastFour)

Firebase Auth:
  Custom Claims: { role: "admin" | "editor" | "viewer" }

Firebase Storage:
  media/{collection}/{entryId}/{filename}

Security Rules:
  firestore.rules           → Firestore access rules
  storage.rules             → Storage access rules
  firestore.indexes.json    → Composite index definitions
```

### Verification

#### Provider Wiring Verification

- [x] Run admin in REST mode — verify no behavior regressions on login, list/create/edit entries, media upload
- [x] Switch to Firebase mode — verify same core UI flows complete without `/api` network usage
- [x] Verify both providers pass the same contract tests

#### Security Verification (Firebase Emulator)

- [x] Validate each action (read/create/update/delete/publish/media upload) against role permutations
- [x] Confirm unauthenticated users are denied all actions
- [x] Confirm forbidden writes are blocked by rules, not only hidden in UI

#### Data Behavior Verification

- [x] Validate filtering/sorting/pagination behavior in Firebase mode for representative collection sizes
- [x] Validate soft-delete and publish state transitions are reflected consistently in list/detail views
- [x] Validate offline persistence works correctly

#### Test Execution

- [x] Run existing REST test suite — no regressions
- [x] Run new Firebase emulator integration tests — all pass
- [x] Run provider contract tests — both providers implement interface correctly

#### Documentation Verification

- [x] Confirm README/backend mode docs accurately describe supported vs unsupported features for Firebase MVP
- [x] Confirm Firebase setup guide covers env vars, emulator setup, index deployment, security rules

---

### Decisions

- **Chosen scope:** MVP — minimal viable Firebase integration
- **Package strategy:** New `packages/cms-firebase/` package — `packages/cms/` remains untouched
- **Provider abstraction:** `AdminProvider` interface in `packages/admin-ui/`, Firebase implementation in `packages/cms-firebase/`
- **Data model:** Option A — one Firestore collection per CMS collection slug (simpler queries, easier indexes)
- **Versioning:** Option A — minimal `updatedAt/version` only (Option B: full revision subcollections deferred to parity phase)
- **Schema management:** Option A — read-only schema UI in Firebase mode with CLI-managed schema source of truth

### Out of Scope for MVP

- API tokens verification (no server to verify)
- Runtime schema write/edit in browser
- Server-side webhook dispatch
- Scheduled publishing workers
- GraphQL endpoint
- Full revision history (subcollections)

---

## M37: Extract Admin UI into `@arche-cms/admin-ui` Package (Complete)

### Objective

Move the admin panel from `packages/cms/src/admin/` into a standalone `packages/admin-ui/` package (`@arche-cms/admin-ui`).

### Status

Merged to main via PR #29 (`feat/separate-admin-ui` branch).

- [x] Create `packages/admin-ui/` with `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- [x] Move all admin source files (`components/`, `lib/`, `routes/`, `main.tsx`, `router.tsx`, `index.css`, `vite-env.d.ts`)
- [x] Move admin dependencies from `packages/cms/package.json` to `packages/admin-ui/package.json`
- [x] Remove admin dependencies from `packages/cms/package.json`
- [x] Add `@arche-cms/admin-ui` as workspace dependency in `packages/cms`
- [x] Update `static.ts` to find admin build from `@arche-cms/admin-ui/dist/`
- [x] Update `dev.ts` to resolve admin source from `@arche-cms/admin-ui`
- [x] Update `build.ts` to copy admin build from `@arche-cms/admin-ui`
- [x] Remove unused exports from admin-ui (`field-types/index.ts`, `api.ts`, `hooks.ts`, `schemas/components/index.ts`, `structure-inputs.tsx`)
- [x] Upgrade `@fastify/static` to v10 (removes deprecated `glob@11.1.0`)
- [x] Run `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` — all pass
- [x] Verify `cms dev` serves admin panel from `@arche-cms/admin-ui`
- [x] Verify `cms build --out-dir` includes admin build in production bundle
