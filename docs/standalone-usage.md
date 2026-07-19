# Using Arche CMS as a Standalone App

You can use Arche CMS without cloning the monorepo. The `@arche-cms/cms` package provides a `cms` binary that runs a full CMS server (admin panel + REST API + GraphQL) from your project's schema files.

## Quick start

### Scaffold a new project

```bash
npx @arche-cms/create-app my-cms
cd my-cms
pnpm install
pnpm dev
```

### Or use an existing project

```bash
npm install @arche-cms/cms
npx cms dev
```

## What you get

When you run `cms dev`, Arche starts a full CMS server at `http://localhost:3000`:

| Endpoint                                 | Description                         |
| ---------------------------------------- | ----------------------------------- |
| `http://localhost:3000`                  | Admin panel (login, content editor) |
| `http://localhost:3000/docs`             | Swagger UI (REST API docs)          |
| `http://localhost:3000/graphql`          | GraphQL playground                  |
| `http://localhost:3000/api/<collection>` | REST CRUD endpoints                 |
| `http://localhost:3000/graphiql`         | GraphiQL IDE                        |
| `http://localhost:3000/health`           | Health check                        |

## Default admin account

On first start, Arche auto-creates a default admin account:

| Email                 | Password   |
| --------------------- | ---------- |
| `admin@arche-cms.com` | `admin123` |

Change this password after your first login.

## Requirements

In production (`cms start`), you **must** set the `AUTH_SECRET` environment variable:

```bash
export AUTH_SECRET=$(openssl rand -hex 32)
cms start
```

In development (`cms dev`), a temporary secret is auto-generated if not set.

### Example REST endpoints

If you have a `posts` collection in `cms/collections/posts.ts`:

```bash
# List all posts
curl http://localhost:3000/api/posts

# Get a post by ID
curl http://localhost:3000/api/posts/1

# Create a post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello World", "status": "draft"}'
```

### Auto-migrations

On first start, Arche auto-creates the SQLite database and runs any pending migrations based on your schema files. No manual setup needed.

## Production deployment

Build the CMS for production:

```bash
npx @arche-cms/cms build
```

This produces a production bundle with:

- Compiled server code
- Bundled admin panel
- `.dockerignore` and `Dockerfile`

## Commands

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `cms dev`      | Development server with hot-reload   |
| `cms start`    | Production server (no file watching) |
| `cms build`    | Build for production                 |
| `cms generate` | Run code generation                  |
| `cms migrate`  | Run database migrations              |
| `cms typegen`  | Generate TypeScript types            |
| `cms lint`     | Validate schema definitions          |
| `cms doctor`   | Check project health                 |

## Configuration

Create an `arche-cms.config.ts` file in your project root:

```ts
import { defineConfig } from "@arche-cms/cms";

export default defineConfig({
  schema: {
    baseDir: "./cms",
  },
  database: {
    adapter: "sqlite",
    url: "file:./cms.db",
  },
});
```

## Using with Docker

```bash
cms build --out-dir ./build
cd ./build
docker build -t my-cms .
docker run -p 3000:3000 my-cms
```

The built `Dockerfile` uses `node:24-alpine`, installs production dependencies, and runs `cms start`.
