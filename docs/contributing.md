# Contributing Guide

## Development Setup

### Prerequisites

- Node.js >= 20
- Yarn 4 (`corepack enable`)
- Git

### Clone and Install

```bash
git clone https://github.com/Altrugenix/cms.git
cd cms
corepack enable
yarn install
```

### Development

```bash
# Start all dev servers
yarn dev

# Build all packages
yarn build

# Run all tests
yarn test

# Run lint + typecheck + test
yarn lint && yarn typecheck && yarn test
```

## Project Structure

```
apps/           # Application packages (admin, api, docs, playground)
packages/       # Library packages (core, schema, database, plugins, etc.)
docs/           # Documentation
cms/            # CMS schema definitions (user-created)
```

See [architecture.md](architecture.md) for the full project layout and dependency graph.

## Workflow

1. Pick an item from [TODO.md](TODO.md) or create an issue
2. Create a branch from `main`
3. Make changes following the conventions below
4. Write or update tests
5. Run `yarn lint && yarn typecheck && yarn test` — all must pass
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
- Playwright for E2E tests (in `apps/admin/e2e/`)
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

## Packages

| Package                   | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `@altrugenix/core`        | DI container, event bus, lifecycle, logger, config |
| `@altrugenix/schema`      | Schema definition API                              |
| `@altrugenix/types`       | Shared TypeScript types                            |
| `@altrugenix/database`    | Database adapters (SQLite, PostgreSQL)             |
| `@altrugenix/auth`        | JWT authentication                                 |
| `@altrugenix/permissions` | RBAC engine                                        |
| `@altrugenix/storage`     | File storage (local, S3, R2)                       |
| `@altrugenix/rest-api`    | REST API route generator                           |
| `@altrugenix/graphql`     | GraphQL schema generator                           |
| `@altrugenix/validation`  | Zod validation generator                           |
| `@altrugenix/plugins`     | Plugin system + official plugins                   |
| `@altrugenix/generators`  | Code generation pipeline                           |
| `@altrugenix/cli`         | CLI tools                                          |
| `@altrugenix/admin-ui`    | Shared admin UI components                         |
| `@altrugenix/sdk`         | TypeScript client SDK                              |
