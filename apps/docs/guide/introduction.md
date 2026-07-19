# Introduction

Arche CMS is a **file-based, developer-first, open-source headless CMS**. Schema is stored in source files, not in the database — inspired by Strapi and Payload, but designed for type safety, extensibility, and excellent developer experience.

## Philosophy

- **Schema as code** — your content model lives in TypeScript files, version-controlled alongside your application
- **Code generation** — types, APIs, validation, and migrations are auto-generated from schema definitions
- **Zero lock-in** — self-hosted, open-source, standard technologies (TypeScript, Fastify, Drizzle ORM)
- **Pluggable by design** — every part of the system is extensible via plugins, hooks, and events

## Key Features

| Feature           | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| Schema Definition | 29 field types, collections, globals, components                             |
| REST API          | Auto-generated CRUD with filtering, sorting, pagination, relation population |
| GraphQL API       | Auto-generated queries and mutations with GraphiQL                           |
| OpenAPI Spec      | Auto-generated OpenAPI 3.1 with Swagger UI                                   |
| TypeScript SDK    | Auto-generated typed client for external integrations                        |
| Validation        | Auto-generated Zod schemas from field definitions                            |
| Database          | SQLite, PostgreSQL, MySQL, Turso, Cloudflare D1                              |
| Storage           | Local, S3-compatible, Cloudflare R2                                          |
| Auth              | JWT with access/refresh tokens, API tokens, forgot/reset password            |
| Permissions       | RBAC with field-level access control                                         |
| Plugins           | SEO, Audit Log, Webhooks, Search, Comments, Analytics                        |
| Admin UI          | React 19 dashboard with TanStack Router, TanStack Query, shadcn/ui           |
| CLI               | dev, build, start, generate, migrate, typegen, lint, doctor                  |

## Tech Stack

- **Runtime**: Node.js 22+
- **Language**: TypeScript (strict mode)
- **API Server**: Fastify with Mercurius (GraphQL)
- **Database**: Drizzle ORM with adapter pattern
- **Admin UI**: React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS v4, shadcn/ui
- **Validation**: Zod
- **Auth**: JWT (jose)
- **Package Manager**: pnpm
- **Repository**: Turborepo monorepo
