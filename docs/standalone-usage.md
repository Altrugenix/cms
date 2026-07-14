# Using Arche CMS as a Standalone App

You can use Arche CMS without cloning the monorepo. The `@arche-cms/cms` package provides a `cms` binary that runs a full CMS server (admin panel + REST API + GraphQL) from your project's schema files.

## Quick start

```bash
npx @arche-cms/cms dev
```

This will:

1. Create a `cms/` directory with example schema files
2. Start the CMS server on `http://localhost:3000`
3. Watch schema files for changes and hot-reload

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

The built `Dockerfile` uses `node:22-alpine`, installs production dependencies, and runs `cms start`.
