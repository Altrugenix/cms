# Product Requirements Document — Arche CMS

> **Status:** v1 — Implementation Complete
> **Last Updated:** July 19, 2026

---

## 1. Executive Summary

Arche CMS is a modern, open-source, developer-first headless content management system. Schema definitions live in source code files rather than the database — making the file system the single source of truth for content models. The CMS automatically generates types, database schemas, migrations, APIs (REST + GraphQL), validation, and admin UI from these schema files.

The project is inspired by Strapi and Payload but differentiated by its file-first approach, clean architecture, type safety, and extensive plugin system.

---

## 2. Problem Statement

Existing headless CMS solutions suffer from:

- **Schema lock-in:** Collection definitions stored in the database make version control, code review, and collaboration difficult.
- **Limited type safety:** Runtime-generated schemas produce weak or no TypeScript types.
- **Poor DX:** Admin UIs for schema editing often lag, break, or produce opaque output.
- **Architecture debt:** Many CMS platforms prioritize speed over clean architecture, leading to maintenance challenges at scale.

---

## 3. Target Audience

| Persona                     | Needs                                                                    |
| --------------------------- | ------------------------------------------------------------------------ |
| **Developer**               | Type-safe APIs, version-controlled schemas, CLI tools, local development |
| **Content Editor**          | Intuitive admin UI, drag-and-drop page building, rich text editing       |
| **Team Lead**               | RBAC, audit logs, workflow automation, plugin ecosystem                  |
| **Open Source Contributor** | Clean architecture, testability, documentation, modular packages         |

---

## 4. Core Features (MVP) — Completed

### 4.1 File-Based Schema

- Define collections, globals, and components in `.ts` files under `cms/`
- Auto-discover and validate schemas on server start and file changes
- Full TypeScript autocomplete via the `defineCollection` API
- Zod-based runtime validation of schema definitions
- 29 field types including text, media, relations, components, dynamic zones, and more

### 4.2 Database Layer

- Drizzle ORM with adapter pattern (SQLite + PostgreSQL)
- Auto-generate migrations from schema files
- Query builder exposed for custom queries

### 4.3 Admin Panel

- Dashboard with content stats and recent activity
- CRUD for all collections and globals
- Media library with upload, delete, and folder organization
- User management and RBAC
- Dark mode and responsive design
- Command palette and keyboard shortcuts
- Settings page with API tokens, webhooks, plugins, users, roles
- Pagination on all list views
- 404 page and forgot/reset password flow
- TanStack Query for data fetching with caching and background refetch
- Schema builder with drag-and-drop field editor

### 4.4 API Generation

- REST API (auto-generated routes per collection) with OpenAPI/Swagger
- GraphQL API (auto-generated schema and resolvers) with GraphiQL
- Zod validation schemas auto-derived from field definitions
- TypeScript SDK for typed API access

### 4.5 Authentication

- JWT-based auth (access + refresh tokens)
- API tokens (long-lived, revocable) for programmatic access
- Login, register, forgot/reset password
- Session management

### 4.6 CLI

- `cms dev`, `cms start`, `cms build`, `cms generate`, `cms migrate`
- `cms typegen`, `cms lint`, `cms doctor`
- `cms collection create`, `cms plugin create`
- `--vite` flag for admin UI HMR in development

---

## 5. Post-MVP Features — Completed

### 5.1 Content Features

- [x] Draft / publish workflow
- [x] Version history and revisions
- [x] Autosave
- [x] Scheduled publishing
- [x] Localization / i18n
- [x] Soft delete

### 5.2 Schema Builder (Visual)

- [x] Drag-and-drop field editor
- [x] Reorder, edit, and configure fields visually
- [x] Preview generated TypeScript schema
- [x] Save schema to file

### 5.3 Plugin System

- [x] Plugin registry with auto-discovery
- [x] Hooks and event subscriptions
- [x] Official plugins: SEO, Comments, Audit Log, Analytics, Webhooks, Search

### 5.4 Advanced API

- [x] API keys / service tokens
- [x] Rate limiting
- [x] Webhook delivery with retry and HMAC signing

### 5.5 Developer Tools

- [x] TypeScript SDK (`@arche-cms/sdk`)
- [x] `@arche-cms/create-app` scaffolding with Dockerfile generation

---

## 6. Non-Goals (v1)

- Visual page builder / layout editor
- Form builder
- Realtime collaboration (CRDT-based)
- Multi-tenancy
- Plugin marketplace / store
- AI content generation assistant
- Workflow automation engine
- Revisions / version history diff view

---

## 7. User Stories

### Developer

```
As a developer, I want to define my content model in a TypeScript file
so that I can version control it, review changes in PRs, and get full type safety.
```

```
As a developer, I want to run `cms generate` to produce types, routes, and migrations
from my schema files so that I don't write boilerplate.
```

```
As a developer, I want to extend the CMS with a plugin
so that I can add custom functionality without forking the core.
```

### Content Editor

```
As a content editor, I want to create and edit content in an admin panel
so that I don't need to interact with code or API tools.
```

```
As a content editor, I want to preview changes before publishing
so that I can verify content appears correctly.
```

### Administrator

```
As an administrator, I want to assign roles and permissions to users
so that team members only access what they need.
```

---

## 8. Technical Requirements

### 8.1 Performance

- Admin panel load under 2s (cold start)
- API response under 200ms (p95) for read operations
- Cold start schema loading under 500ms for 50+ collections

### 8.2 Security

- JWT with configurable expiry and refresh rotation
- RBAC at field-level granularity
- Input validation via auto-generated Zod schemas
- CSRF protection, rate limiting, security headers

### 8.3 Compatibility

- Node.js 22+ LTS
- Modern browsers (Chrome, Firefox, Safari, Edge — last 2 major versions)
- SQLite (file-based) for local dev; PostgreSQL for production

### 8.4 Portability

- Zero external service dependencies for basic operation
- SQLite default — no DB server needed for local development

---

## 9. Architecture Constraints

- Schema is the source of truth — never stored in DB
- All packages are independently testable
- Plugin system must not require core modifications
- Database adapters are swappable via interface
- API generation is driven by schema metadata, not runtime reflection

---

## 10. Milestones

### Milestone 1: Foundation (Weeks 1–3) — Completed

- Monorepo setup (Turborepo, pnpm, TypeScript)
- Core DI container and event bus
- Schema definition API (`defineCollection`, field helpers)
- Schema loader (discover, parse, validate)

### Milestone 2: Data Layer (Weeks 4–6) — Completed

- Database adapter interfaces
- Drizzle ORM integration (SQLite + PostgreSQL)
- Auto-migration generation from schemas
- CRUD repository pattern

### Milestone 3: API Layer (Weeks 7–9) — Completed

- REST API generator
- GraphQL schema generator
- Zod validation generation
- OpenAPI spec generation

### Milestone 4: Auth & Permissions (Weeks 10–11) — Completed

- JWT auth package
- RBAC engine
- Admin login flow

### Milestone 5: Admin UI (Weeks 12–16) — Completed

- Admin app scaffold (Vite + React + TanStack Router + TanStack Query)
- Login page and auth flow
- Collection CRUD views
- Media library
- User and role management
- Dark mode + responsive
- Settings page (API tokens, webhooks, plugins)

### Milestone 6: CLI & Code Generation (Weeks 17–18) — Completed

- CLI scaffold
- Code generation pipeline
- Scaffolding commands

### Milestone 7: Plugin System (Weeks 19–20) — Completed

- Plugin registry and loader
- Hook system
- Official plugins (SEO, Audit Log, Webhooks, Search, Comments, Analytics)

### Milestone 8: Polish & Launch (Weeks 21–24) — Completed

- Documentation (VitePress site + root docs)
- Error handling and edge cases
- Performance optimization
- Public release (v0.1.0, v0.2.0)

---

## 11. Success Metrics

| Metric                                  | Target      | Status   |
| --------------------------------------- | ----------- | -------- |
| Time to first content model (developer) | < 5 minutes | Achieved |
| Time to first API call                  | < 2 minutes | Achieved |
| Admin panel Lighthouse score            | > 90        | —        |
| Plugin install time (npm + register)    | < 1 minute  | Achieved |
| Test coverage                           | > 80%       | 94.97%   |
| Package test suite runtime              | < 30s       | —        |

---

## 12. Risks and Mitigations

| Risk                                                 | Impact | Mitigation                                                           |
| ---------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| Schema file parsing becomes slow with large projects | High   | Implement file watching with caching, lazy loading                   |
| Database migration conflicts in team environments    | Medium | Generate deterministic migration IDs, diff-based migration detection |
| Plugin API too restrictive for complex extensions    | High   | Design plugin API with extension points early, gather feedback       |
| Admin UI bundle too large                            | Medium | Code-split by route, lazy-load editor components                     |

---

## 13. Glossary

| Term           | Definition                                                       |
| -------------- | ---------------------------------------------------------------- |
| **Collection** | A content type (e.g., Post, User, Category) with defined fields  |
| **Global**     | A singleton content type (e.g., Settings, Site Config)           |
| **Component**  | A reusable field group (e.g., SEO, Hero Block)                   |
| **Schema**     | The definition of fields for a collection, global, or component  |
| **Field**      | An individual property with a type (e.g., text, relation, media) |
| **Adapter**    | A pluggable interface implementation (e.g., database, storage)   |
| **Plugin**     | An npm package that extends CMS functionality                    |
