# TypeScript SDK

The `@arche-cms/sdk` package provides a fully-typed HTTP client for interacting with the CMS API from external applications.

## Installation

```bash
pnpm add @arche-cms/sdk
```

## Quick Start

```ts
import { createClient } from "@arche-cms/sdk";

const client = createClient({
  baseUrl: "http://localhost:3000",
  token: "your-jwt-token", // optional
});
```

## Collection Client

```ts
// List posts with pagination
const posts = await client.collection("posts").list({
  limit: 10,
  offset: 0,
  sort: "createdAt:desc",
  where: { status: "published" },
});
// posts: { data: Record<string, unknown>[], total: number, limit: number, offset: number }

// Get single post
const post = await client.collection("posts").get("1");

// Create post
const created = await client.collection("posts").create({
  title: "Hello World",
  status: "published",
});

// Update post
const updated = await client.collection("posts").update("1", {
  title: "Updated Title",
});

// Delete post
await client.collection("posts").delete("1");

// Bulk delete
await client.collection("posts").bulkDelete(["1", "2", "3"]);

// Publish / unpublish / restore
await client.collection("posts").publish("1");
await client.collection("posts").unpublish("1");
await client.collection("posts").restore("1");

// Version history
const versions = await client.collection("posts").versions("1");
await client.collection("posts").restoreVersion("1", "v1");
```

## Global Client

```ts
const settings = await client.global("site-settings").get();
await client.global("site-settings").upsert({
  siteName: "My Blog",
  description: "A blog powered by Arche CMS",
});
```

## Auth Client

```ts
// Login
const { token, user } = await client.auth.login("admin@example.com", "password");

// Register
const result = await client.auth.register("user@example.com", "password", "John");

// Refresh token
const refreshed = await client.auth.refresh(refreshToken);

// Forgot/reset password
await client.auth.forgotPassword("user@example.com");
await client.auth.resetPassword("reset-token", "new-password");
```

## Media Client

```ts
// List media files
const files = await client.media.list({ limit: 20 });

// Upload file
const file = await client.media.upload(fileBlob);

// Delete file
await client.media.delete("file-id");
```

## Users & Roles

```ts
// Users
const users = await client.users.list();
const user = await client.users.get("user-id");
const created = await client.users.create({ email: "new@example.com", password: "pass" });
await client.users.update("user-id", { name: "New Name" });
await client.users.delete("user-id");

// Roles
const roles = await client.roles.list();
const role = await client.roles.get("role-id");
```

## Error Handling

```ts
import { createClient, ApiError } from "@arche-cms/sdk";

try {
  await client.collection("posts").create({ title: "" });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status); // 400, 401, 403, 404, 409, 500
    console.error(error.message); // "Validation failed"
    console.error(error.details); // validation error details
  }
}
```

## Configuration

```ts
const client = createClient({
  baseUrl: "http://localhost:3000", // CMS API base URL
  token: "jwt-or-api-token", // optional auth token
  fetch: customFetch, // optional custom fetch implementation
});
```

## Interceptors

```ts
const client = createClient({
  baseUrl: "http://localhost:3000",
});

// Request interceptor
client.onRequest((request) => {
  console.log("Request:", request.method, request.url);
});

// Response interceptor
client.onResponse((response) => {
  console.log("Response:", response.status);
});

// Error interceptor
client.onError((error) => {
  console.error("API Error:", error.message);
});
```
