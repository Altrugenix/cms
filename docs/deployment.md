# Deployment Guide

## Prerequisites

- Node.js >= 22
- Database (SQLite or PostgreSQL)
- (Optional) S3-compatible storage

## Quick Start (Development)

```bash
# Clone and install
git clone https://github.com/Arche-CMS/arche-cms.git
cd arche-cms
corepack enable
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start
pnpm dev
```

## Production Build

```bash
# Build all packages (CMS server + admin panel)
pnpm build
```

## Configuration

Config via environment variables:

| Variable               | Default                 | Description                                 |
| ---------------------- | ----------------------- | ------------------------------------------- |
| `PORT`                 | 3000                    | Server port                                 |
| `HOST`                 | 0.0.0.0                 | Server host                                 |
| `DB_URL`               | `file:./cms.db`         | Database URL                                |
| `DB_ADAPTER`           | `sqlite`                | Database adapter (`sqlite` or `postgres`)   |
| `AUTH_SECRET`          | —                       | JWT signing secret (required in production) |
| `AUTH_ACCESS_EXPIRES`  | `15m`                   | Access token TTL                            |
| `AUTH_REFRESH_EXPIRES` | `7d`                    | Refresh token TTL                           |
| `SCHEMA_DIR`           | `./cms`                 | Schema definition directory                 |
| `STORAGE_DIR`          | `./uploads`             | Upload directory                            |
| `CORS_ORIGIN`          | `http://localhost:5173` | Allowed CORS origins                        |
| `RATE_LIMIT_MAX`       | 100                     | Max requests per window                     |
| `RATE_LIMIT_WINDOW`    | `1 minute`              | Rate limit window                           |
| `LOG_LEVEL`            | `info`                  | Log level                                   |

## Deployment Options

### Docker (Scaffolded)

The `@arche-cms/create-app` tool generates a multi-stage Dockerfile:

```dockerfile
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

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

### Docker Compose

```yaml
version: "3.8"
services:
  cms:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_URL=postgres://user:pass@db:5432/cms
      - DB_ADAPTER=postgres
      - AUTH_SECRET=${AUTH_SECRET}
    volumes:
      - ./cms:/app/cms
      - ./uploads:/app/uploads
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=cms
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### Manual Deployment (Linux)

```bash
# Build
pnpm build

# Run migrations
npx cms migrate --run

# Start server
npx cms start
```

### Using a Process Manager (PM2)

```bash
npm install -g pm2
pm2 start "npx cms start" --name cms-api
pm2 save
pm2 startup
```

## Production Checklist

### Security

- [ ] Set a strong `AUTH_SECRET` (min 32 chars)
- [ ] Configure CORS to your admin domain only
- [ ] Enable HTTPS (reverse proxy with nginx/Caddy)
- [ ] Set `NODE_ENV=production`
- [ ] Rate limit auth endpoints separately
- [ ] Regular dependency updates

### Database

- [ ] Use PostgreSQL for production (SQLite is for development)
- [ ] Set up regular backups
- [ ] Run migrations before deploying new versions

### Storage

- [ ] Use S3 or R2 for production file storage
- [ ] Set up CDN for file serving

### Monitoring

- [ ] Configure logging to stdout (default)
- [ ] Set up health check monitoring (`GET /health`)
- [ ] Monitor error rates and response times

## Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl;
    server_name cms.example.com;

    ssl_certificate /etc/ssl/certs/cms.crt;
    ssl_certificate_key /etc/ssl/private/cms.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/cms/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## Environment Files

```bash
# .env
PORT=3000
HOST=0.0.0.0
DB_URL=postgres://user:pass@localhost:5432/cms
DB_ADAPTER=postgres
AUTH_SECRET=your-strong-secret-at-least-32-chars-long
AUTH_ACCESS_EXPIRES=15m
AUTH_REFRESH_EXPIRES=7d
SCHEMA_DIR=./cms
STORAGE_DIR=./uploads
CORS_ORIGIN=https://admin.example.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
LOG_LEVEL=info
```
