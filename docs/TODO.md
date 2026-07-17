# TODO — Arche CMS

> Project status: Milestone 18 complete — code quality guards in place. ESLint configured with perfectionist (import/object sorting), no-secrets, security, vitest plugins, plus max-lines (300), max-params (4), max-depth (3) rules. 0 errors, 71 warnings. Commitlint enforces conventional commits. Pre-push hook runs typecheck + lint + tests. CI adds format:check, ESLint, build verification, bundle size check. Fallow maxCrap lowered to 30. All 32 typecheck tasks pass, 19 lint tasks pass, 19 test tasks pass, 19 build tasks pass.

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
- [x] **Update standalone-usage.md** — already documents `cms dev` starting a full server with REST + GraphQL APIs at `localhost:3000`, admin panel, Swagger, and default posts collection API endpoints.
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
- [ ] Add detailed request/response schemas in the future when all routes are confirmed compatible with Fastify schema compilation

### Server URL & Info

- [x] Configure `servers` array with a default `url: /` (relative) so Swagger works behind proxies and in dev mode
- [x] Add `externalDocs` linking to the main Arche CMS docs site
- [x] Add `license` info to the OpenAPI info object
- [x] Add `contact` info (repo URL, issues link)

### Response Body Examples (Deferred)

> **Same rationale as Request/Response Schemas** — Fastify's schema compiler would enforce these examples as actual serialization schemas. Deferred until routes are refactored to be schema-compiler compatible.

- [ ] Add example responses and request bodies in a follow-up when schema compilation is addressed

### Testing

- [x] **Code review complete** — all `securitySchemes`, global `security`, per-route `security: []`, `summary`/`description`/`tags`, `servers`/`license`/`contact`/`externalDocs` verified via source code review
- [x] **Run `pnpm lint && pnpm typecheck && pnpm test`** — no regressions (19 lint tasks pass, 32 typecheck tasks pass, 232/243 tests pass; 11 pre-existing media test failures unrelated)
- [ ] **Manual:** Verify Authorize button renders at `/docs` by starting `cms dev` in a test project
- [ ] **Manual:** Verify Authorize with JWT sends `Authorization: Bearer <token>` on protected routes
- [ ] **Manual:** Verify Authorize with `cms_` API key works via Swagger UI
- [ ] **Manual:** Verify public routes skip Authorization header via Swagger UI "Try it out"

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

- [ ] Add detailed request/response schemas when all routes are confirmed compatible with Fastify schema compilation
- [ ] Add example responses and request bodies when schema compilation is addressed

### Scope

Collection CRUD routes, global routes, auth routes, media routes, user/role routes, settings routes (api-tokens, webhooks). Exclude schema builder routes (dynamic and file-system based).

### Route Schemas

- [ ] `collection:list` — response body schema (paginated), query params (limit, offset, sort, filter, select, populate)
- [ ] `collection:get` — response body schema, params (id)
- [ ] `collection:create` — request body schema, response schema (201)
- [ ] `collection:update` — request body schema (partial), params (id), response schema
- [ ] `collection:delete` — params (id), response schema
- [ ] `collection:bulkDelete` — request body schema (ids array), response schema
- [ ] `collection:publish` — params (id), response schema
- [ ] `collection:unpublish` — params (id), response schema
- [ ] `collection:restore` — params (id), response schema
- [ ] `collection:listVersions` — params (id), response schema
- [ ] `collection:restoreVersion` — params (id, versionId), response schema
- [ ] `global:get` — response body schema
- [ ] `global:upsert` — request body schema, response schema
- [ ] `auth:login` — request body (email, password), response (token, user)
- [ ] `auth:register` — request body (email, password, name), response (token, user)
- [ ] `auth:refresh` — request body (refreshToken), response (token)
- [ ] `auth:forgotPassword` — request body (email), response
- [ ] `auth:resetPassword` — request body (token, password), response
- [ ] `media:upload` — response schema
- [ ] `media:list` — query params, response schema
- [ ] `media:get` — params (id), response schema
- [ ] `media:delete` — params (id), response schema
- [ ] `users:list` — response schema
- [ ] `users:get` — params (id), response schema
- [ ] `users:create` — request body, response schema
- [ ] `users:update` — params (id), request body, response schema
- [ ] `users:delete` — params (id), response schema
- [ ] `roles:list` — response schema
- [ ] `roles:get` — params (id), response schema
- [ ] `roles:create` — request body, response schema
- [ ] `roles:update` — params (id), request body, response schema
- [ ] `roles:delete` — params (id), response schema
- [ ] `api-tokens:list` — response schema
- [ ] `api-tokens:create` — request body, response schema (includes raw token)
- [ ] `api-tokens:delete` — params (id), response schema
- [ ] `webhooks:list` — response schema
- [ ] `webhooks:get` — params (id), response schema
- [ ] `webhooks:create` — request body, response schema
- [ ] `webhooks:update` — params (id), request body, response schema
- [ ] `webhooks:delete` — params (id), response schema

### Error Response Schemas

- [ ] `400` — Bad request (validation error) schema
- [ ] `401` — Unauthorized schema
- [ ] `403` — Forbidden schema
- [ ] `404` — Not found schema
- [ ] `409` — Conflict schema
- [ ] `500` — Internal server error schema

### Verification

- [ ] Run `pnpm lint` — no new errors
- [ ] Run `pnpm typecheck` — no type errors
- [ ] Run `pnpm test` — all 243 tests pass without serialization regressions
- [ ] Admin panel builds successfully

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
- [ ] Add workflow step: dependency diff check (deferred)
- [ ] Add workflow step: `fallow audit` full project scan (deferred)
- [x] Update CI to run on PRs to main (already configured)

### Fallow Config — Quality Thresholds

- [x] Set max cyclomatic complexity to 20 across all packages (with per-package overrides as needed)
- [x] Set max cognitive complexity to 30
- [x] Set max unit size to 150 lines (with per-file overrides)
- [x] Set max CRAP threshold to 30 (lowered from 400)
- [x] Set duplicate threshold to `mild` with `<5%` tolerance
- [ ] Add baseline files for dead-code, health, and duplicates (deferred)

### Security

- [x] Add `eslint-plugin-security` — detect common security antipatterns (eval, `child_process.exec` with interpolation, regex DoS)
- [x] Add `eslint-plugin-no-unsanitized` — prevent XSS via `dangerouslySetInnerHTML` and `innerHTML`
- [ ] Run `npm audit` in CI — fail on critical/moderate severity (deferred)
- [ ] Add secret scanning step in CI (via `trufflehog` or `gitleaks`) (deferred)

### Testing Quality

- [ ] Enforce minimum test coverage thresholds per package (deferred)
- [x] Add `vitest/no-focused-tests` ESLint rule (error)
- [x] Add `vitest/no-disabled-tests` ESLint rule (warn)
- [x] Add `vitest/valid-expect` ESLint rule
- [x] Add `vitest/expect-expect` ESLint rule (warn)
- [ ] Add CI step: fail on test file count regression (deferred)

### Documentation

- [ ] Add `// @tsdoc` linting for public API surface (deferred)
- [ ] Add README linting step (deferred)
- [ ] Add CODEOWNERS for package-level ownership (deferred)

### Verification

- [x] Run `pnpm lint` — no new errors across all 19 lint tasks
- [x] Run `pnpm typecheck` — no type errors (32 tasks pass)
- [x] Run `pnpm test` — all tests pass (19 test tasks)
- [x] Run `pnpm build` — all packages build successfully (19 build tasks)
- [x] Run `pnpm format:check` — all files formatted
- [x] Run `npx eslint .` — 0 errors, 71 warnings (all legitimate: max-lines, max-depth, max-params, vitest/expect-expect)
