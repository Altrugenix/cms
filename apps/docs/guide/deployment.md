# Deployment

## Quick Deploy (Docker)

```bash
docker run -p 3000:3000 arche-cms/cms
```

## Scaffolding a New Project

The recommended way to create a new Arche CMS project:

```bash
npx @arche-cms/create-app my-project
cd my-project
```

This generates a complete project with:

- Example `cms/collections/posts.ts` and `cms/globals/site-settings.ts`
- `.env` with default configuration
- `Dockerfile` (multi-stage build with Node.js 24 Alpine)
- `.dockerignore`
- `package.json` with dev/start/build scripts

### Dockerfile

The scaffolded Dockerfile uses a multi-stage build:

```dockerfile
# Builder stage
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runner stage
FROM node:24-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/cms ./cms
EXPOSE 3000
USER cms
CMD ["npx", "cms", "start"]
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `AUTH_SECRET` (required for `cms start`)
- [ ] Configure database URL (`DATABASE_URL` for PostgreSQL, or use default SQLite)
- [ ] Configure storage backend (local/S3/R2)
- [ ] Set up reverse proxy (nginx/Caddy)
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure CI/CD pipeline

## Supported Deployments

- **Docker** — Single container with multi-stage build
- **Docker Compose** — CMS + PostgreSQL + nginx
- **PM2** — Process manager for Node.js
- **Serverless** — Vercel, Netlify (API only)
- **VPS** — Direct deployment on any Linux server

See the full Deployment Guide in the repository for detailed instructions.
