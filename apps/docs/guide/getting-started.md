# Getting Started

## Prerequisites

- Node.js 20+
- pnpm
- SQLite (default) or PostgreSQL

## Installation

```bash
# Clone the repository
git clone https://github.com/Arche-CMS/arche-cms.git
cd cms

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

This starts:

- **API server** at `http://localhost:3001`
- **Admin UI** at `http://localhost:5173`
- **Swagger UI** at `http://localhost:3001/docs`
- **GraphiQL** at `http://localhost:3001/graphiql`

## Project Structure

```
cms/
├── apps/
│   ├── admin/          # Admin panel UI (React 19)
│   ├── api/            # Fastify API server
│   └── docs/           # Documentation site
├── packages/
│   ├── core/           # DI container, event bus, lifecycle, logger
│   ├── schema/         # Schema definition API (defineCollection, field helpers)
│   ├── database/       # Database adapter layer (Drizzle ORM)
│   ├── auth/           # JWT authentication
│   ├── permissions/    # RBAC / permissions engine
│   ├── storage/        # File storage adapters
│   ├── rest-api/       # REST API generator
│   ├── graphql/        # GraphQL schema generator
│   ├── validation/     # Zod validation generator
│   ├── generators/     # Code generation pipeline
│   ├── plugins/        # Plugin system + official plugins
│   ├── cli/            # CLI tools
│   ├── admin-ui/       # Shared admin UI components
│   ├── builder/        # Visual schema builder
│   ├── types/          # Shared TypeScript types
│   └── sdk/            # TypeScript client SDK
├── cms/
│   ├── collections/    # Your collection definitions
│   ├── globals/        # Your global definitions
│   └── components/     # Your component definitions
└── docs/              # Documentation markdown
```

## Your First Collection

Create `cms/collections/posts.ts`:

```ts
import { defineCollection, text, slug, richText, relation, select } from "@arche-cms/schema";

export default defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    text("title", { validation: { required: true } }),
    slug("slug", { from: "title" }),
    richText("content"),
    relation("author", { to: "users" }),
    select("status", { options: ["draft", "published"] }),
  ],
});
```

The CMS automatically:

- Generates TypeScript types
- Creates database tables and migrations
- Exposes REST + GraphQL APIs
- Generates the Admin UI form
- Creates Zod validation schemas
- Sets up permissions
