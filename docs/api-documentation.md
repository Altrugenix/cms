# API Documentation

## Overview

The Altrugenix CMS API is auto-generated from your schema definitions. Every collection and global produces corresponding REST endpoints and GraphQL operations.

- **Base URL**: `http://localhost:3000`
- **Auth**: JWT Bearer tokens via `Authorization: Bearer <token>` header
- **Format**: JSON

---

## REST API

### Authentication

| Endpoint                    | Method | Description               |
| --------------------------- | ------ | ------------------------- |
| `/api/auth/register`        | POST   | Register a new user       |
| `/api/auth/login`           | POST   | Login and get tokens      |
| `/api/auth/refresh`         | POST   | Refresh access token      |
| `/api/auth/me`              | GET    | Get current user          |
| `/api/auth/forgot-password` | POST   | Request password reset    |
| `/api/auth/reset-password`  | POST   | Reset password with token |

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

#### GET /api/auth/me

Headers: `Authorization: Bearer <token>`

Response (200):

```json
{
  "id": "1",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin"
}
```

### Collections

For each collection (e.g. `posts`), the following routes are generated:

#### List entries

```
GET /api/posts?limit=10&offset=0&sort=createdAt:desc&filter={"status":"published"}
```

Response (200):

```json
{
  "data": [{ "id": "1", "title": "Hello", "status": "published" }],
  "meta": { "total": 42, "limit": 10, "offset": 0 }
}
```

Query parameters:

| Param    | Type   | Default          | Description           |
| -------- | ------ | ---------------- | --------------------- |
| `limit`  | int    | 10               | Max results (max 100) |
| `offset` | int    | 0                | Number to skip        |
| `sort`   | string | `createdAt:desc` | Field and direction   |
| `filter` | JSON   | —                | Field filters         |

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

```
GET  /api/globals/site-settings
POST /api/globals/site-settings
```

GET returns the current value. POST creates or updates (upsert).

### Media

| Endpoint                 | Method | Auth | Description           |
| ------------------------ | ------ | ---- | --------------------- |
| `/api/media`             | GET    | Yes  | List media files      |
| `/api/media/:id`         | GET    | Yes  | Get media metadata    |
| `/api/media`             | POST   | Yes  | Upload file           |
| `/api/media/:id`         | PATCH  | Yes  | Update media metadata |
| `/api/media/:id`         | DELETE | Yes  | Delete media          |
| `/api/media/file/:id`    | GET    | Yes  | Serve file            |
| `/api/media/folders`     | GET    | Yes  | List folders          |
| `/api/media/folders/:id` | GET    | Yes  | Get folder            |
| `/api/media/folders`     | POST   | Yes  | Create folder         |
| `/api/media/folders/:id` | PATCH  | Yes  | Update folder         |
| `/api/media/folders/:id` | DELETE | Yes  | Delete folder         |

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

### Meta Endpoints

| Endpoint           | Method | Description                              |
| ------------------ | ------ | ---------------------------------------- |
| `/api/collections` | GET    | List all collections with field metadata |
| `/api/globals`     | GET    | List all globals with field metadata     |
| `/api/schemas`     | GET    | List saved schema files                  |
| `/api/roles`       | GET    | List roles                               |
| `/api/roles/:id`   | GET    | Get role                                 |
| `/api/roles`       | POST   | Create role                              |
| `/api/roles/:id`   | PATCH  | Update role                              |
| `/api/roles/:id`   | DELETE | Delete role                              |
| `/api/users`       | GET    | List users                               |
| `/api/users/:id`   | GET    | Get user                                 |
| `/api/users/:id`   | PATCH  | Update user                              |
| `/api/users/:id`   | DELETE | Delete user                              |
| `/api/activity`    | GET    | Recent activity feed                     |
| `/health`          | GET    | Health check                             |
| `/docs`            | GET    | Swagger UI                               |
| `/docs/json`       | GET    | OpenAPI spec (JSON)                      |

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
  post(id: "1") {
    id
    title
    status
  }
}

# List with filtering
query {
  postsList(limit: 10, offset: 0, sort: CREATEDAT_DESC) {
    id
    title
    status
  }
}
```

### Mutations

```graphql
# Create
mutation {
  createPost(data: { title: "New Post", status: draft }) {
    id
    title
  }
}

# Update
mutation {
  updatePost(id: "1", data: { title: "Updated" }) {
    id
    title
  }
}

# Delete
mutation {
  deletePost(id: "1")
}
```

### Filtering

```graphql
query {
  postsList(filter: { status: { equals: "published" }, title: { contains: "hello" } }) {
    id
    title
  }
}
```

Supported filter operators: `equals`, `notEquals`, `contains`, `notContains`, `greaterThan`, `lessThan`, `in`, `notIn`.

### Sorting

```graphql
query {
  postsList(sort: TITLE_ASC, limit: 10) {
    id
    title
  }
}
```

Sort values: `{FIELD}_ASC` / `{FIELD}_DESC` (e.g. `TITLE_ASC`, `CREATEDAT_DESC`).

### Relation Resolution

Relations are resolved automatically at the type level:

```graphql
query {
  post(id: "1") {
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

## SDK

A TypeScript SDK is available at `@altrugenix/sdk`:

```ts
import { createClient } from "@altrugenix/sdk";

const client = createClient({
  baseUrl: "https://cms.example.com",
  token: "your-token",
});

const posts = await client.posts.list({ limit: 10 });
```
