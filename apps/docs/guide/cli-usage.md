# CLI Usage

## Commands

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `cms dev`               | Start CMS in development mode with file watching |
| `cms start`             | Start CMS in production mode                     |
| `cms build`             | Build CMS for production                         |
| `cms generate`          | Run code generation pipeline                     |
| `cms migrate`           | Generate and run database migrations             |
| `cms typegen`           | Generate TypeScript types from schemas           |
| `cms lint`              | Validate schema definitions                      |
| `cms doctor`            | Check project health                             |
| `cms collection create` | Scaffold a new collection                        |
| `cms plugin create`     | Scaffold a new plugin                            |

## Flags

### `cms dev`

| Flag                  | Description                                 | Default         |
| --------------------- | ------------------------------------------- | --------------- |
| `--dir <path>`        | Schema directory                            | `./cms`         |
| `--port <num>`        | Server port                                 | `3000`          |
| `--host <addr>`       | Server host                                 | `0.0.0.0`       |
| `--db-url <url>`      | Database URL                                | `file:./cms.db` |
| `--db-adapter <type>` | Database adapter                            | `sqlite`        |
| `--vite`              | Start Vite dev server for admin UI with HMR | `false`         |

### `cms start`

| Flag                  | Description      | Default         |
| --------------------- | ---------------- | --------------- |
| `--dir <path>`        | Schema directory | `./cms`         |
| `--port <num>`        | Server port      | `3000`          |
| `--host <addr>`       | Server host      | `0.0.0.0`       |
| `--db-url <url>`      | Database URL     | `file:./cms.db` |
| `--db-adapter <type>` | Database adapter | `sqlite`        |

### `cms build`

| Flag               | Description            | Default  |
| ------------------ | ---------------------- | -------- |
| `--clean`          | Clean output directory | `false`  |
| `--out-dir <path>` | Output directory       | `./dist` |

### Other Commands

| Flag           | Commands                                 | Description        |
| -------------- | ---------------------------------------- | ------------------ |
| `--dir <path>` | migrate, generate, typegen, lint, doctor | Schema directory   |
| `--fix`        | lint                                     | Auto-fix issues    |
| `--out <path>` | generate, typegen                        | Output directory   |
| `--db <path>`  | migrate                                  | Database file path |

## Quick Start

```bash
# Start development
cms dev

# Start with Vite dev server (HMR for admin panel)
cms dev --vite

# Check your setup
cms doctor

# Scaffold a collection
cms collection create posts

# Generate types and APIs
cms generate

# Run migrations
cms migrate

# Build for production
cms build

# Start production server
cms start
```
