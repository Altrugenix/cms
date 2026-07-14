# Architecture Notes

## Overview

Arche CMS is a file-based, developer-first headless CMS built as a modular monolith. Schema is stored in source files (not the database) and code is auto-generated from those definitions.

## Core Principles

- **Domain-Driven Design** — each package owns a bounded context
- **Clean Architecture** — dependency inversion, stable abstractions
- **Modular Monolith** — packages can be extracted into microservices later
- **Feature-First** — packages organized by feature, not layer
- **Type Safety** — TypeScript strict mode across all packages
- **Event-Driven** — internal communication via EventBus

## Monorepo Layout

```
apps/
├── admin/          # React admin panel (Vite + TanStack Router)
├── api/            # Fastify API server
├── docs/           # Documentation site
└── playground/     # Dev playground

packages/
├── core/           # DI container, event bus, lifecycle, logger, config
├── schema/         # Schema definition API (defineCollection, field helpers)
├── types/          # Shared TypeScript types
├── database/       # Database adapters (SQLite, PostgreSQL), repository, migrations
├── auth/           # JWT authentication
├── permissions/    # RBAC engine
├── storage/        # File storage (local, S3, R2)
├── rest-api/       # REST API route generator
├── graphql/        # GraphQL schema generator
├── validation/     # Zod validation schema generator
├── plugins/        # Plugin system + official plugins
├── admin-ui/       # Shared admin UI components
├── builder/        # Visual schema builder
├── generators/     # Code generation pipeline
├── sdk/            # TypeScript client SDK
└── cli/            # CLI tools
```

## Data Flow

1. User defines schema in `cms/collections/*.ts`
2. SchemaLoader discovers and loads schema files
3. Code generation pipeline produces types, routes, validation, migrations
4. API server registers generated routes
5. Database adapter persists data
6. Admin UI consumes the auto-generated API

## Dependency Graph

```
types (foundation)
  ├── core
  ├── schema
  │   ├── validation
  │   ├── rest-api
  │   ├── graphql
  │   └── generators
  ├── database
  │   ├── auth
  │   ├── permissions
  │   └── rest-api
  ├── plugins
  └── storage
        └── api
```

## Plugin Architecture

Plugins integrate via PluginManager, which provides:

- Plugin registry (register/unregister/enable/disable)
- Hook system (beforeSchemaLoad, afterRouteRegister, etc.)
- Extension points (custom fields, admin panels)
- Auto-discovery from node_modules

## Code Generation Pipeline

The generators package orchestrates all code generation:

```
Schema Definitions
  → TypeScript Types (typegen)
  → API Routes (REST)
  → Zod Validation Schemas
  → Database Migrations
  → GraphQL Schema
  → OpenAPI Spec
  → Admin Forms
  → TypeScript SDK
```

Each generator implements the `Generator` interface and is run by `GenerationPipeline`.
