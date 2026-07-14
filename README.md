# Arche CMS

**File-based, open-source, developer-first headless CMS.**

Schema definitions live in source code files, not the database. The CMS automatically generates types, database schemas, migrations, REST + GraphQL APIs, Zod validation, and an admin panel — all from plain TypeScript schema files.

```ts
// cms/collections/posts.ts
export default defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    text("title", { localized: true }),
    slug("slug", { source: "title" }),
    richText("content"),
    relation("author", { to: "users" }),
    select("status", { options: ["draft", "published"] }),
  ],
});
```

## Features

- **File-first schemas** — version-controlled, reviewable, diffable
- **REST + GraphQL APIs** — auto-generated from schema definitions
- **Admin panel** — dark mode, responsive, command palette, with shadcn/ui
- **Draft/publish workflow** — with scheduled publishing and soft delete
- **Localization** — per-field locale support with locale-prefixed API queries
- **Version history** — automatic versioning on every create/update with restore
- **Plugin system** — SEO, search, audit log, webhooks, analytics, comments
- **RBAC** — role-based permissions with field-level access control
- **Media library** — drag-and-drop upload, folders, with local/S3/R2 storage
- **CLI** — `cms dev`, `cms build`, `cms generate`, `cms migrate`, `cms typegen`
- **TypeScript SDK** — auto-generated client for type-safe API consumption
- **OpenAPI docs** — interactive Swagger UI at `/docs`

## Quick Start

### Use via npx (no install)

```bash
npx @arche-cms/cms dev
```

This starts a full CMS server with an admin panel, REST API, and GraphQL playground — no configuration needed.

### Or install globally

```bash
npm install -g @arche-cms/cms
cms dev
```

### Or clone the monorepo

```bash
git clone https://github.com/Arche-CMS/arche-cms.git
cd cms
yarn install
yarn dev
```

Open `http://localhost:5173` for the admin panel and `http://localhost:3000/docs` for API docs.

## Architecture

```
arche-cms/
├── apps/
│   ├── admin/          # Admin panel (React + TanStack Router + Tailwind v4)
│   ├── api/            # Fastify API server
│   └── docs/           # Documentation site (VitePress)
├── packages/
│   ├── cms/            # Main CMS package (CLI + server)
│   ├── core/           # DI container, event bus, lifecycle
│   ├── schema/         # defineCollection API, field helpers, validation
│   ├── database/       # Drizzle ORM adapter (SQLite, PostgreSQL)
│   ├── auth/           # JWT authentication
│   ├── permissions/    # RBAC engine
│   ├── rest-api/       # REST route generator
│   ├── graphql/        # GraphQL schema generator
│   ├── validation/     # Zod schema generator
│   ├── generators/     # Code generation pipeline
│   ├── storage/        # Local, S3, R2 adapters
│   ├── plugins/        # Plugin system + official plugins
│   ├── admin-ui/       # Shared admin components
│   ├── sdk/            # TypeScript client SDK
│   └── types/          # Shared TypeScript types
```

## Field Types

text, textarea, number, boolean, date, datetime, email, password, url, json, richText, markdown, code, color, media, upload, select, multiSelect, radio, checkbox, relation, component, dynamicZone, array, object, tabs, group, repeater, slug

## Database Support

- SQLite (development)
- PostgreSQL
- MySQL (planned)
- Turso, Cloudflare D1 (planned)

## Commands

| Command        | Description                  |
| -------------- | ---------------------------- |
| `yarn dev`     | Start dev servers            |
| `yarn build`   | Build all packages           |
| `yarn test`    | Run all tests                |
| `yarn lint`    | Lint all packages            |
| `cms dev`      | Start CMS dev mode           |
| `cms build`    | Build CMS for production     |
| `cms generate` | Run code generation pipeline |
| `cms migrate`  | Run database migrations      |
| `cms typegen`  | Generate TypeScript types    |
| `cms doctor`   | Check project health         |

## Plugins

Official plugins included: SEO, Audit Log, Webhooks, Search, Comments, Analytics. Extend with custom fields, admin panels, and API routes via the plugin API.

## License

MIT
