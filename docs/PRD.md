# Product Requirements Document — Arche CMS

> **Status:** Draft v1
> **Last Updated:** July 8, 2026

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

## 4. Core Features (MVP)

### 4.1 File-Based Schema

- Define collections, globals, and components in `.ts` files under `cms/`
- Auto-discover and validate schemas on server start and file changes
- Full TypeScript autocomplete via the `defineCollection` API
- Zod-based runtime validation of schema definitions

### 4.2 Database Layer

- Drizzle ORM with adapter pattern (SQLite + PostgreSQL initially)
- Auto-generate migrations from schema files
- Query builder exposed for custom queries

### 4.3 Admin Panel

- Dashboard with content stats and recent activity
- CRUD for all collections and globals
- Media library with upload, delete, and folder organization
- User management and RBAC
- Dark mode and responsive design
- Command palette and keyboard shortcuts

### 4.4 API Generation

- REST API (auto-generated routes per collection)
- GraphQL API (auto-generated schema and resolvers)
- Zod validation schemas auto-derived from field definitions
- OpenAPI spec generation

### 4.5 Authentication

- JWT-based auth (access + refresh tokens)
- Login, register, forgot/reset password
- Session management

### 4.6 CLI

- `cms dev`, `cms build`, `cms generate`, `cms migrate`
- `cms typegen`, `cms lint`, `cms doctor`
- Scaffolding for collections and plugins

---

## 5. Post-MVP Features

### 5.1 Content Features

- Draft / publish workflow
- Version history and revisions
- Autosave
- Scheduled publishing
- Localization / i18n
- Soft delete

### 5.2 Schema Builder (Visual)

- Drag-and-drop field editor
- Reorder, edit, and configure fields visually
- Preview generated TypeScript schema
- Save schema to file

### 5.3 Plugin System

- Plugin registry with auto-discovery
- Hooks and event subscriptions
- Official plugins: SEO, Comments, Audit Log, Analytics, Webhooks, Search

### 5.4 Advanced API

- GraphQL subscriptions
- API keys / service tokens
- Rate limiting
- Caching layer

### 5.5 Developer Tools

- TypeScript SDK generation
- Live preview integration
- Webhook testing UI
- API explorer UI

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

- Node.js 20+ LTS
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

### Milestone 1: Foundation (Weeks 1–3)

- Monorepo setup (Turborepo, Yarn, TypeScript)
- Core DI container and event bus
- Schema definition API (`defineCollection`, field helpers)
- Schema loader (discover, parse, validate)

### Milestone 2: Data Layer (Weeks 4–6)

- Database adapter interfaces
- Drizzle ORM integration (SQLite + PostgreSQL)
- Auto-migration generation from schemas
- CRUD repository pattern

### Milestone 3: API Layer (Weeks 7–9)

- REST API generator
- GraphQL schema generator
- Zod validation generation
- OpenAPI spec generation

### Milestone 4: Auth & Permissions (Weeks 10–11)

- JWT auth package
- RBAC engine
- Admin login flow

### Milestone 5: Admin UI (Weeks 12–16)

- Admin app scaffold (Vite + React Router)
- Login page and auth flow
- Collection CRUD views
- Media library
- User and role management
- Dark mode + responsive

### Milestone 6: CLI & Code Generation (Weeks 17–18)

- CLI scaffold
- Code generation pipeline
- Scaffolding commands

### Milestone 7: Plugin System (Weeks 19–20)

- Plugin registry and loader
- Hook system
- Sample plugins

### Milestone 8: Polish & Launch (Weeks 21–24)

- Documentation
- Error handling and edge cases
- Performance optimization
- Public release

---

## 11. Success Metrics

| Metric                                  | Target      |
| --------------------------------------- | ----------- |
| Time to first content model (developer) | < 5 minutes |
| Time to first API call                  | < 2 minutes |
| Admin panel Lighthouse score            | > 90        |
| Plugin install time (npm + register)    | < 1 minute  |
| Test coverage                           | > 80%       |
| Package test suite runtime              | < 30s       |

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
