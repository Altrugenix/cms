# @arche-cms/sdk

TypeScript client SDK for the Arche CMS API. Provides a fully typed HTTP client for interacting with any Arche CMS instance.

## Installation

```bash
pnpm add @arche-cms/sdk
```

## Quick Start

```ts
import { createClient } from "@arche-cms/sdk";

const client = createClient({
  baseUrl: "https://cms.example.com",
  token: "your-api-token", // optional
});
```

## Collections

```ts
// Type the client with your collection schema
interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: "draft" | "published";
}

const posts = client.collection<Post>("posts");

// List with pagination
const { data, total } = await posts.list({ limit: 10, offset: 0 });

// Get by ID
const post = await posts.get("1");

// Create
const created = await posts.create({ title: "Hello", slug: "hello" });

// Update
const updated = await posts.update("1", { title: "Updated" });

// Delete
await posts.delete("1");

// Bulk operations
await posts.bulkDelete(["1", "2", "3"]);

// Publishing
await posts.publish("1");
await posts.unpublish("1");

// Soft delete restore
await posts.restore("1");

// Version history
const { data: versions } = await posts.versions("1");
await posts.restoreVersion("1", "v1");
```

### Query Parameters

```ts
const { data, total } = await posts.list({
  limit: 25,
  offset: 0,
  sort: "title:asc",
  select: ["title", "slug"],
  populate: ["author"],
  locale: "en",
  where: { status: "published" },
});
```

## Globals

```ts
interface SiteSettings {
  siteName: string;
  description: string;
}

const settings = client.global<SiteSettings>("site-settings");

const data = await settings.get();
const updated = await settings.upsert({ siteName: "My Blog" });
```

## Auth

```ts
// Login
const { user, accessToken, refreshToken } = await client.auth.login(
  "email@example.com",
  "password",
);

// Register
await client.auth.register("email@example.com", "password");

// Refresh tokens
await client.auth.refresh(refreshToken);

// Get current user
const me = await client.auth.me();

// Password reset
await client.auth.forgotPassword("email@example.com");
await client.auth.resetPassword("token", "newPassword");

// Setup status
const { hasAdmin } = await client.auth.setupStatus();
```

## Media

```ts
// List media files
const { data: files } = await client.media.list({ limit: 10 });

// Upload (base64)
const uploaded = await client.media.upload({
  fileName: "image.png",
  mimeType: "image/png",
  data: "base64-encoded-data",
  alt: "Description",
});

// Get metadata
const file = await client.media.get("1");

// Delete
await client.media.delete("1");

// Media folders
const { data: folders } = await client.media.folders.list();
await client.media.folders.create({ name: "Images" });
```

## Users & Roles

```ts
// Users
const { data: users } = await client.users.list();
const user = await client.users.create({ email: "user@example.com", password: "pass" });
await client.users.update("1", { role: "admin" });
await client.users.delete("1");

// Roles
const { data: roles } = await client.roles.list();
const role = await client.roles.create({
  name: "Editor",
  permissions: [{ action: "read", resource: "posts" }],
});
await client.roles.delete("1");
```

## Settings (API Tokens & Webhooks)

```ts
// API Tokens
const { data: tokens } = await client.settings.apiTokens.list();
const { rawToken } = await client.settings.apiTokens.create({ name: "My Token" });
await client.settings.apiTokens.delete("1");

// Webhooks
const { data: hooks } = await client.settings.webhooks.list();
await client.settings.webhooks.create({
  name: "Notify",
  url: "https://example.com/hook",
  events: ["collection:created", "collection:updated"],
});
await client.settings.webhooks.update("1", { enabled: false });
await client.settings.webhooks.delete("1");
```

## Activity

```ts
const { data: entries } = await client.activity.list({
  action: "create",
  collection: "posts",
  limit: 50,
});
```

## Error Handling

```ts
import { ApiError } from "@arche-cms/sdk";

try {
  await client.collection("posts").get("nonexistent");
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status); // 404
    console.log(error.message); // "Not found"
    console.log(error.code); // "NOT_FOUND"
    console.log(error.details); // [{ path: [...], message: "..." }]
  }
}
```

## Authentication

The SDK supports two authentication methods:

### API Token

```ts
const client = createClient({
  baseUrl: "https://cms.example.com",
  token: "cms_your-api-token",
});
```

### JWT (via Auth Client)

```ts
const client = createClient({ baseUrl: "https://cms.example.com" });
const { accessToken } = await client.auth.login("email@example.com", "password");
client.setToken(accessToken);
```

## Custom Fetch

Use a custom fetch implementation for Node.js, testing, or alternative runtimes:

```ts
import { createClient } from "@arche-cms/sdk";
import nodeFetch from "node-fetch";

const client = createClient({
  baseUrl: "https://cms.example.com",
  token: "cms_token",
  fetch: nodeFetch as typeof globalThis.fetch,
});
```

## License

MIT
