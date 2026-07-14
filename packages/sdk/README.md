# @arche-cms/sdk

TypeScript client SDK for the Arche CMS API. Provides a typed client for interacting with any Arche CMS instance.

## Installation

```bash
yarn add @arche-cms/sdk
```

## Usage

```ts
import { createClient } from "@arche-cms/sdk";

const client = createClient({
  baseUrl: "https://cms.example.com",
  token: "your-api-token",
});

// CRUD operations
const posts = await client.posts.list({ limit: 10 });
const post = await client.posts.get("1");
const created = await client.posts.create({ title: "Hello", status: "draft" });
const updated = await client.posts.update("1", { title: "Updated" });
await client.posts.delete("1");
```
