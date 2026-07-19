# API Documentation

## Overview

The Arche CMS API is auto-generated from your schema definitions. Every collection and global produces corresponding REST endpoints and GraphQL operations.

- **Base URL**: `http://localhost:3000`
- **Auth**: JWT Bearer tokens or API tokens via `Authorization: Bearer <token>` header
- **Format**: JSON

---

## REST API

### Authentication

Two authentication methods are supported:

1. **JWT Token** — short-lived access tokens with refresh rotation
2. **API Token** — long-lived, explicitly revocable tokens created in the admin UI

```bash
# JWT authentication
curl -H "Authorization: Bearer <jwt-token>" http://localhost:3000/api/posts

# API token authentication
curl -H "Authorization: Bearer cms_<token>" http://localhost:3000/api/posts
```

#### Auth Endpoints

| Endpoint                    | Method | Description               | Auth |
| --------------------------- | ------ | ------------------------- | ---- |
| `/api/auth/register`        | POST   | Register a new user       | No*  |
| `/api/auth/login`           | POST   | Login and get tokens      | No   |
| `/api/auth/refresh`         | POST   | Refresh access token      | No   |
| `/api/auth/forgot-password` | POST   | Request password reset    | No   |
| `/api/auth/reset-password`  | POST   | Reset password with token | No   |
| `/api/auth/setup-status`    | GET    | Check if admin exists     | No   |

*Register requires admin permissions unless it's the first user (setup guard).

#### POST /api/auth/register

```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe"
}
```

Response (201):

```json
{
  "user": { "id": "1", "email": "user@example.com", "name": "John Doe" },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

#### POST /api/auth/login

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

Response (200): Same format as register.

#### POST /api/auth/refresh

```json
{
  "refreshToken": "eyJhbG..."
}
```

Response (200): New `accessToken` and `refreshToken`.

### Collections

For each collection (e.g. `posts`), the following routes are generated:

| Method | Path                                                | Description                |
| ------ | --------------------------------------------------- | -------------------------- |
| GET    | `/api/{collection}`                                 | List entries               |
| GET    | `/api/{collection}/:id`                             | Get single entry           |
| POST   | `/api/{collection}`                                 | Create entry               |
| PATCH  | `/api/{collection}/:id`                             | Update entry               |
| DELETE | `/api/{collection}/:id`                             | Delete entry               |
| POST   | `/api/{collection}/bulk-delete`                     | Bulk delete entries        |
| POST   | `/api/{collection}/:id/publish`                     | Publish draft              |
| POST   | `/api/{collection}/:id/unpublish`                   | Unpublish entry            |
| POST   | `/api/{collection}/:id/restore`                     | Restore soft-deleted entry |
| GET    | `/api/{collection}/:id/versions`                    | List versions              |
| POST   | `/api/{collection}/:id/versions/:versionId/restore` | Restore version            |

#### Query Parameters

| Param          | Type    | Default          | Description                          |
| -------------- | ------- | ---------------- | ------------------------------------ |
| `limit`        | int     | 10               | Max results (max 100)                |
| `offset`       | int     | 0                | Number to skip                       |
| `sort`         | string  | `createdAt:desc` | Field and direction                  |
| `select`       | string  | —                | Field selection (e.g., `title,body`) |
| `populate`     | string  | —                | Relation population (e.g., `author`) |
| `where[field]` | any     | —                | Filter by field value                |
| `locale`       | string  | —                | Locale for localized content         |
| `deleted`      | boolean | false            | Include soft-deleted entries         |

#### List entries

```
GET /api/posts?limit=10&offset=0&sort=createdAt:desc&where[status]=published
```

Response (200):

```json
{
  "data": [{ "id": "1", "title": "Hello", "status": "published" }],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

#### Get entry

```
GET /api/posts/:id
```

Response (200): Single entry object.

Response (404):

```json
{ "error": "Not found", "statusCode": 404, "code": "NOT_FOUND" }
```

#### Create entry

```
POST /api/posts
```

Body: Entry data matching the collection schema.

Response (201): Created entry object.

#### Update entry

```
PATCH /api/posts/:id
```

Body: Partial entry data.

Response (200): Updated entry object.

#### Delete entry

```
DELETE /api/posts/:id
```

Response (200):

```json
{ "deleted": true }
```

#### Bulk delete

```
POST /api/posts/bulk-delete
```

```json
{ "ids": ["1", "2", "3"] }
```

Response (200):

```json
{ "deleted": 3 }
```

### Globals

For each global (e.g. `site-settings`):

| Method | Path                 | Description        |
| ------ | -------------------- | ------------------ |
| GET    | `/api/globals/:slug` | Get global data    |
| PUT    | `/api/globals/:slug` | Upsert global data |

GET returns the current value. PUT creates or updates (upsert).

### Media

| Endpoint                 | Method | Auth | Description        |
| ------------------------ | ------ | ---- | ------------------ |
| `/api/media`             | GET    | Yes  | List media files   |
| `/api/media/:id`         | GET    | Yes  | Get media metadata |
| `/api/media`             | POST   | Yes  | Upload file        |
| `/api/media/:id`         | DELETE | Yes  | Delete media       |
| `/api/media/file/:id`    | GET    | Yes  | Serve file         |
| `/api/media/folders`     | POST   | Yes  | Create folder      |
| `/api/media/folders/:id` | DELETE | Yes  | Delete folder      |

#### POST /api/media (Upload)

```json
{
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "data": "/9j/4AAQSkZJRg...",
  "folderId": 1
}
```

The `data` field is base64-encoded file content.

### Users

| Method | Path             | Description |
| ------ | ---------------- | ----------- |
| GET    | `/api/users`     | List users  |
| GET    | `/api/users/:id` | Get user    |
| POST   | `/api/users`     | Create user |
| PATCH  | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Roles

| Method | Path             | Description |
| ------ | ---------------- | ----------- |
| GET    | `/api/roles`     | List roles  |
| GET    | `/api/roles/:id` | Get role    |
| POST   | `/api/roles`     | Create role |
| PATCH  | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete role |

### Settings

| Method | Path                           | Description      |
| ------ | ------------------------------ | ---------------- |
| GET    | `/api/settings/api-tokens`     | List API tokens  |
| POST   | `/api/settings/api-tokens`     | Create API token |
| DELETE | `/api/settings/api-tokens/:id` | Revoke API token |
| GET    | `/api/settings/webhooks`       | List webhooks    |
| GET    | `/api/settings/webhooks/:id`   | Get webhook      |
| POST   | `/api/settings/webhooks`       | Create webhook   |
| PUT    | `/api/settings/webhooks/:id`   | Update webhook   |
| DELETE | `/api/settings/webhooks/:id`   | Delete webhook   |

### System

| Method | Path            | Description  |
| ------ | --------------- | ------------ |
| GET    | `/health`       | Health check |
| GET    | `/api/activity` | Activity log |
| GET    | `/api/plugins`  | List plugins |

### Error Responses

All errors follow the structured format:

```json
{
  "error": "Human-readable message",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "details": []
}
```

Common error codes:

| Code                | Status | Description                    |
| ------------------- | ------ | ------------------------------ |
| `VALIDATION_ERROR`  | 400    | Invalid request body or params |
| `AUTH_ERROR`        | 401    | Missing or invalid auth token  |
| `FORBIDDEN`         | 403    | Insufficient permissions       |
| `NOT_FOUND`         | 404    | Resource not found             |
| `CONFLICT`          | 409    | Duplicate entry                |
| `PAYLOAD_TOO_LARGE` | 413    | Request body exceeds limit     |
| `INTERNAL_ERROR`    | 500    | Unexpected server error        |

---

## GraphQL API

**Endpoint**: `/graphql`

**Auth**: Requires `Authorization: Bearer <token>` header.

**GraphiQL**: Available at `/graphiql` for interactive exploration.

### Queries

For a collection `posts`, the following queries are generated:

```graphql
# Get by ID
query {
  getPost(id: "1") {
    id
    title
    status
  }
}

# List with pagination
query {
  listPosts(limit: 10, offset: 0, sort: createdAt_desc) {
    data {
      id
      title
      status
    }
    total
    limit
    offset
  }
}
```

### Mutations

```graphql
# Create
mutation {
  createPost(input: { title: "New Post", status: draft }) {
    id
    title
  }
}

# Update
mutation {
  updatePost(id: "1", input: { title: "Updated" }) {
    id
    title
  }
}

# Delete
mutation {
  deletePost(id: "1")
}
```

### Globals

Globals are also available via GraphQL:

```graphql
query {
  getSiteSettings {
    siteName
    description
  }
}

mutation {
  updateSiteSettings(data: { siteName: "My Blog" }) {
    siteName
  }
}
```

### Filtering

```graphql
query {
  listPosts(filter: { status: { equals: "published" }, title: { contains: "hello" } }) {
    data {
      id
      title
    }
  }
}
```

Supported filter operators: `equals`, `notEquals`, `contains`, `notContains`, `greaterThan`, `lessThan`, `in`, `notIn`.

### Sorting

```graphql
query {
  listPosts(sort: title_asc, limit: 10) {
    data {
      id
      title
    }
  }
}
```

### Relation Resolution

Relations are resolved automatically at the type level:

```graphql
query {
  getPost(id: "1") {
    title
    author {
      id
      name
      email
    }
  }
}
```

---

## TypeScript SDK

The `@arche-cms/sdk` package provides a fully-typed HTTP client:

```ts
import { createClient } from "@arche-cms/sdk";

const client = createClient({
  baseUrl: "http://localhost:3000",
  token: "your-jwt-or-api-token",
});

// List posts
const posts = await client.collection("posts").list({ limit: 10 });

// Get single post
const post = await client.collection("posts").get("1");

// Create post
const created = await client.collection("posts").create({
  title: "Hello World",
  status: "published",
});

// Global settings
const settings = await client.global("site-settings").get();

// Auth
const { token } = await client.auth.login("admin@example.com", "password");
```

See the [SDK Reference](../apps/docs/reference/sdk.md) for full API documentation.
