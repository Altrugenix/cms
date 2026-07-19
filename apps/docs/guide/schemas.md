# Schemas

Schemas are TypeScript files that define your content model. They live in `cms/collections/`, `cms/globals/`, and `cms/components/`.

## Collections

Collections are for repeatable content entries (like blog posts, users, products).

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

## Globals

Globals are for singleton content (like site settings, navigation).

```ts
import { defineGlobal, text, textarea, media } from "@arche-cms/schema";

export default defineGlobal({
  slug: "site-settings",
  label: "Site Settings",
  fields: [
    text("siteName", { validation: { required: true } }),
    textarea("description"),
    media("logo"),
  ],
});
```

## Components

Components are reusable field groups that can be composed into collections and globals.

```ts
import { defineComponent, text, textarea } from "@arche-cms/schema";

export default defineComponent({
  slug: "seo",
  fields: [text("title"), textarea("description"), text("ogImage")],
});
```

## Auto-Generated Artifacts

From your schema definitions, the CMS auto-generates:

- **TypeScript types** — `CollectionTypes`, `GlobalTypes`
- **REST API routes** — CRUD endpoints with OpenAPI spec
- **GraphQL schema** — queries, mutations, types, inputs
- **Zod validation** — create and update validation schemas
- **Database migrations** — CREATE TABLE, ALTER TABLE
- **Admin UI forms** — auto-generated input fields
- **TypeScript SDK** — typed client with full autocompletion
- **Permissions** — auto-registered resources and actions
