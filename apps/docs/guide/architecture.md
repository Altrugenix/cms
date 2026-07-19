# Architecture

## Modular Monolith

Arche CMS follows a **modular monolith** architecture — all packages live in a single process but are organized into distinct, loosely-coupled modules with well-defined interfaces.

```
┌─────────────────────────────────────────────┐
│                  Admin UI                    │
│    (React 19 + Vite + TanStack Router       │
│     + TanStack Query + shadcn/ui)           │
├─────────────────────────────────────────────┤
│                 API Server                   │
│         (Fastify + Mercurius GraphQL)        │
├──────────┬──────────┬──────────┬────────────┤
│  REST    │ GraphQL  │  Auth    │   Media    │
│  Routes  │  Routes  │         │   Routes   │
├──────────┴──────────┴──────────┴────────────┤
│            Plugin System                     │
├──────────┬──────────┬──────────┬────────────┤
│ Schema   │ Database │Permissions│ Storage  │
│ Engine   │ Adapter  │  Engine   │ Adapter   │
├──────────┴──────────┴──────────┴────────────┤
│              Core Framework                  │
│   (DI Container, Event Bus, Lifecycle,      │
│               Config, Logger)               │
└─────────────────────────────────────────────┘
```

## Packages

| Package                  | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `@arche-cms/cms`         | CLI binary, server logic, admin panel                   |
| `@arche-cms/core`        | DI container, event bus, lifecycle, logger              |
| `@arche-cms/schema`      | Schema definition API (defineCollection, field helpers) |
| `@arche-cms/database`    | Database adapter layer (Drizzle ORM)                    |
| `@arche-cms/auth`        | JWT authentication service                              |
| `@arche-cms/permissions` | RBAC / permissions engine                               |
| `@arche-cms/storage`     | File storage adapters (local, S3, R2)                   |
| `@arche-cms/rest-api`    | REST API route generator                                |
| `@arche-cms/graphql`     | GraphQL schema generator                                |
| `@arche-cms/validation`  | Zod validation schema generator                         |
| `@arche-cms/generators`  | Code generation pipeline (types, routes, migrations)    |
| `@arche-cms/plugins`     | Plugin system + official plugins                        |
| `@arche-cms/create-app`  | Project scaffolding CLI                                 |
| `@arche-cms/sdk`         | TypeScript client SDK                                   |
| `@arche-cms/types`       | Shared TypeScript types                                 |

## Key Design Decisions

### Schema-as-Code

Schema definitions are TypeScript files in `cms/collections/`, `cms/globals/`, and `cms/components/`. On startup, the CMS loads, validates, and generates everything from these files. No admin UI required to define content models.

### Adapter Pattern

Database and storage use adapter interfaces (`DatabaseAdapter`, `StorageAdapter`) so you can swap implementations without changing application code.

### Plugin System

Everything is a plugin. The plugin manager hooks into schema loading, route registration, and request handling via typed hooks and extension points.

### Event-Driven Internals

The event bus enables loose coupling between packages. Plugins can listen to lifecycle events (schema loaded, route registered, CRUD operation) without importing specific packages.

## Data Flow

```
Client Request
      │
      ▼
  Fastify Server
      │
      ├── Auth Middleware (JWT verification + API key fallback)
      ├── Permissions Checker (RBAC)
      ├── Plugin Hooks (beforeRequest)
      │
      ├── REST Router ──► Handler ──► Database Adapter ──► SQL/NoSQL
      │       │                        │
      │       └── OpenAPI/Swagger ──────┘
      │
      ├── GraphQL Router ──► Resolver ──► Database Adapter
      │       │
      │       └── GraphiQL
      │
      └── Media Routes ──► Storage Adapter ──► Local/S3/R2
      │
      ├── Plugin Hooks (afterRequest)
      └── Response
```
