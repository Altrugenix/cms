# Architecture

## Modular Monolith

Arche CMS follows a **modular monolith** architecture — all packages live in a single process but are organized into distinct, loosely-coupled modules with well-defined interfaces.

```
┌─────────────────────────────────────────────┐
│                  Admin UI                    │
│          (React 19 + Vite + shadcn)         │
├─────────────────────────────────────────────┤
│                 API Server                   │
│         (Fastify + Mercurius GraphQL)        │
├──────────┬──────────┬──────────┬────────────┤
│  REST    │ GraphQL  │  Auth    │   Media    │
│  Routes  │  Routes  │         │   Routes   │
├──────────┴──────────┴──────────┴────────────┤
│            Plugin System                     │
├──────────┬──────────┬──────────┬────────────┤
│ Schema   │ Database │ Permissions│ Storage  │
│ Engine   │ Adapter  │  Engine   │ Adapter   │
├──────────┴──────────┴──────────┴────────────┤
│              Core Framework                  │
│   (DI Container, Event Bus, Lifecycle,      │
│               Config, Logger)               │
└─────────────────────────────────────────────┘
```

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
      ├── Auth Middleware (JWT verification)
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
