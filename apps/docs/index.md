---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Arche CMS"
  text: "File-based, developer-first, open-source headless CMS"
  tagline: Schema in source files, not the database. Type-safe APIs auto-generated. Everything extensible via plugins.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Arche-CMS/arche-cms

features:
  - title: Schema-Driven
    details: Define collections, globals, and components in TypeScript files. Auto-generate REST, GraphQL, SDK, validation, and migrations.
  - title: Type-Safe
    details: Full TypeScript support with strict mode. Auto-generated types from your schema definitions. End-to-end type safety.
  - title: Pluggable
    details: Everything is a plugin. Hooks, events, extension points. Official plugins for SEO, audit log, webhooks, search, comments, analytics.
  - title: Multi-Database
    details: SQLite, PostgreSQL, MySQL, Turso, Cloudflare D1 support via Drizzle ORM adapter pattern. Swap databases with a config change.
  - title: Auto API
    details: REST API with OpenAPI/Swagger, GraphQL with GraphiQL, and a typed TypeScript SDK — all generated automatically from your schemas.
  - title: Admin UI
    details: React 19 dashboard with TanStack Router, TanStack Query, shadcn/ui, and Tailwind CSS v4. Pagination, media library, schema builder.
---
