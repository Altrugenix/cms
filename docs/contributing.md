# Contributing Guide

## Development Setup

### Prerequisites

- Node.js >= 22
- pnpm (`corepack enable`)
- Git

### Clone and Install

```bash
git clone https://github.com/Arche-CMS/arche-cms.git
cd arche-cms
corepack enable
pnpm install
```

### Development

```bash
# Start all dev servers
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run lint + typecheck + test
pnpm lint && pnpm typecheck && pnpm test
```

## Project Structure

```
apps/           # Application packages (docs, playground)
packages/       # Library packages (cms, core, schema, database, plugins, etc.)
docs/           # Documentation
cms/            # CMS schema definitions (user-created)
```

See [architecture.md](architecture.md) for the full project layout and dependency graph.

## Workflow

1. Pick an item from [TODO.md](TODO.md) or create an issue
2. Create a branch from `main`
3. Make changes following the conventions below
4. Write or update tests
5. Run `pnpm lint && pnpm typecheck && pnpm test` — all must pass
6. Commit using conventional commit format
7. Push and open a pull request

## Code Conventions

### TypeScript

- Strict mode enabled globally
- Use `const` over `let`/`var`
- Named exports over default exports
- No `console.log` or commented-out code in committed code

### Imports

Order: 1) Node built-ins, 2) third-party packages, 3) `@/` project aliases, 4) relative imports. No blank lines between groups.

### File Structure

- One component per file, PascalCase for components
- camelCase for utilities and hooks (with `use` prefix for hooks)
- Tests next to source files: `*.test.ts`
- Types in `src/types/`

### Testing

- Vitest for unit/integration tests
- Playwright for E2E tests (in `packages/cms/src/admin/e2e/`)
- Tests are required for all new features

### Commits

Use conventional commit format:

```
type(scope): description

feat(schema): add richText field type
fix(api): handle empty request body
docs(readme): update installation instructions
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

### Pull Requests

- Title matches the commit message
- Include summary of what and why
- Reference related issues

## Development Principles

1. **Design first** — architecture and types before implementation
2. **Tests first** — write tests before production code
3. **No magic** — explicit over implicit, minimal runtime behavior
4. **Type safety** — leverage TypeScript fully, avoid `any`
5. **Documentation** — every package has a README, every feature is documented

## Packages (17)

| Package                  | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `@arche-cms/cms`         | CLI binary, server logic, admin panel              |
| `@arche-cms/core`        | DI container, event bus, lifecycle, logger, config |
| `@arche-cms/schema`      | Schema definition API                              |
| `@arche-cms/types`       | Shared TypeScript types                            |
| `@arche-cms/database`    | Database adapters (SQLite, PostgreSQL)             |
| `@arche-cms/auth`        | JWT authentication                                 |
| `@arche-cms/permissions` | RBAC engine                                        |
| `@arche-cms/storage`     | File storage (local, S3, R2)                       |
| `@arche-cms/rest-api`    | REST API route generator                           |
| `@arche-cms/graphql`     | GraphQL schema generator                           |
| `@arche-cms/validation`  | Zod validation generator                           |
| `@arche-cms/plugins`     | Plugin system + official plugins                   |
| `@arche-cms/generators`  | Code generation pipeline                           |
| `@arche-cms/create-app`  | Project scaffolding CLI                            |
| `@arche-cms/sdk`         | TypeScript client SDK                              |
