# REST API

The CMS auto-generates REST API endpoints for every collection, plus built-in endpoints for auth, media, users, roles, settings, and system health.

## Collection Endpoints

| Method | Path                                                | Description                | Auth |
| ------ | --------------------------------------------------- | -------------------------- | ---- |
| GET    | `/api/{collection}`                                 | List entries               | Yes  |
| GET    | `/api/{collection}/:id`                             | Get single entry           | Yes  |
| POST   | `/api/{collection}`                                 | Create entry               | Yes  |
| PATCH  | `/api/{collection}/:id`                             | Update entry               | Yes  |
| DELETE | `/api/{collection}/:id`                             | Delete entry               | Yes  |
| POST   | `/api/{collection}/bulk-delete`                     | Bulk delete entries        | Yes  |
| POST   | `/api/{collection}/:id/publish`                     | Publish draft              | Yes  |
| POST   | `/api/{collection}/:id/unpublish`                   | Unpublish entry            | Yes  |
| POST   | `/api/{collection}/:id/restore`                     | Restore soft-deleted entry | Yes  |
| GET    | `/api/{collection}/:id/versions`                    | List versions              | Yes  |
| POST   | `/api/{collection}/:id/versions/:versionId/restore` | Restore version            | Yes  |

## Global Endpoints

| Method | Path                 | Description        | Auth |
| ------ | -------------------- | ------------------ | ---- |
| GET    | `/api/globals/:slug` | Get global data    | Yes  |
| PUT    | `/api/globals/:slug` | Upsert global data | Yes  |

## Auth Endpoints

| Method | Path                        | Description               | Auth |
| ------ | --------------------------- | ------------------------- | ---- |
| POST   | `/api/auth/login`           | Login with email/password | No   |
| POST   | `/api/auth/register`        | Register new user         | No*  |
| POST   | `/api/auth/refresh`         | Refresh access token      | No   |
| POST   | `/api/auth/forgot-password` | Request password reset    | No   |
| POST   | `/api/auth/reset-password`  | Reset password with token | No   |
| GET    | `/api/auth/setup-status`    | Check if admin exists     | No   |

*Register requires admin permissions unless it's the first user (setup guard).

## Media Endpoints

| Method | Path                     | Description       | Auth |
| ------ | ------------------------ | ----------------- | ---- |
| GET    | `/api/media`             | List media files  | Yes  |
| GET    | `/api/media/:id`         | Get media file    | Yes  |
| POST   | `/api/media`             | Upload media file | Yes  |
| DELETE | `/api/media/:id`         | Delete media file | Yes  |
| GET    | `/api/media/file/:id`    | Serve media file  | Yes  |
| POST   | `/api/media/folders`     | Create folder     | Yes  |
| DELETE | `/api/media/folders/:id` | Delete folder     | Yes  |

## User Endpoints

| Method | Path             | Description | Auth |
| ------ | ---------------- | ----------- | ---- |
| GET    | `/api/users`     | List users  | Yes  |
| GET    | `/api/users/:id` | Get user    | Yes  |
| POST   | `/api/users`     | Create user | Yes  |
| PATCH  | `/api/users/:id` | Update user | Yes  |
| DELETE | `/api/users/:id` | Delete user | Yes  |

## Role Endpoints

| Method | Path             | Description | Auth |
| ------ | ---------------- | ----------- | ---- |
| GET    | `/api/roles`     | List roles  | Yes  |
| GET    | `/api/roles/:id` | Get role    | Yes  |
| POST   | `/api/roles`     | Create role | Yes  |
| PATCH  | `/api/roles/:id` | Update role | Yes  |
| DELETE | `/api/roles/:id` | Delete role | Yes  |

## Settings Endpoints

| Method | Path                           | Description      | Auth |
| ------ | ------------------------------ | ---------------- | ---- |
| GET    | `/api/settings/api-tokens`     | List API tokens  | Yes  |
| POST   | `/api/settings/api-tokens`     | Create API token | Yes  |
| DELETE | `/api/settings/api-tokens/:id` | Revoke API token | Yes  |
| GET    | `/api/settings/webhooks`       | List webhooks    | Yes  |
| GET    | `/api/settings/webhooks/:id`   | Get webhook      | Yes  |
| POST   | `/api/settings/webhooks`       | Create webhook   | Yes  |
| PUT    | `/api/settings/webhooks/:id`   | Update webhook   | Yes  |
| DELETE | `/api/settings/webhooks/:id`   | Delete webhook   | Yes  |

## System Endpoints

| Method | Path            | Description  | Auth |
| ------ | --------------- | ------------ | ---- |
| GET    | `/health`       | Health check | No   |
| GET    | `/api/activity` | Activity log | Yes  |
| GET    | `/api/plugins`  | List plugins | Yes  |

## Query Parameters (Collection Endpoints)

| Parameter      | Type    | Description                          |
| -------------- | ------- | ------------------------------------ |
| `limit`        | number  | Page size (default: 10, max: 100)    |
| `offset`       | number  | Pagination offset                    |
| `sort`         | string  | Sort by field (e.g., `title:desc`)   |
| `select`       | string  | Field selection (e.g., `title,body`) |
| `populate`     | string  | Relation population (e.g., `author`) |
| `where[field]` | any     | Filter by field value                |
| `locale`       | string  | Locale for localized content         |
| `deleted`      | boolean | Include soft-deleted entries         |

## Authentication

### JWT Token

```bash
curl -H "Authorization: Bearer <jwt-token>" http://localhost:3000/api/posts
```

### API Token

```bash
curl -H "Authorization: Bearer cms_<token>" http://localhost:3000/api/posts
```

API tokens are created in the admin UI at Settings → API Tokens. They are long-lived, explicitly revocable, and intended for programmatic API access.

## Example Requests

```bash
# List posts
curl http://localhost:3000/api/posts?limit=10&offset=0

# Get single post with author populated
curl http://localhost:3000/api/posts/1?populate=author

# Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Hello World", "status": "published"}'

# Filter posts
curl "http://localhost:3000/api/posts?where[status]=published&sort=createdAt:desc"

# Get global settings
curl http://localhost:3000/api/globals/site-settings

# Upload media
curl -X POST http://localhost:3000/api/media \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"file": {"data": "<base64>", "mimeType": "image/png", "name": "logo.png"}}'
```

## OpenAPI / Swagger

The REST API is self-documenting via OpenAPI 3.1. Visit `/docs` on your API server to access the Swagger UI with interactive endpoint testing.

## Error Responses

| Status | Code                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| 400    | `VALIDATION_ERROR`  | Invalid request body or query params |
| 401    | `UNAUTHORIZED`      | Missing or invalid JWT/API token     |
| 403    | `FORBIDDEN`         | Insufficient permissions             |
| 404    | `NOT_FOUND`         | Resource not found                   |
| 409    | `CONFLICT`          | Unique constraint violation          |
| 413    | `PAYLOAD_TOO_LARGE` | Request body exceeds limit           |
| 500    | `INTERNAL_ERROR`    | Server error                         |
