# @arche-cms/cms

The main Arche CMS package. Provides a `cms` binary for development, building, code generation, and schema management.

## Installation

```bash
yarn add @arche-cms/cms
```

## Commands

| Command                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `cms dev`               | Start the development server with file watching |
| `cms build`             | Build for production                            |
| `cms generate`          | Run all code generators                         |
| `cms typegen`           | Generate TypeScript types from schemas          |
| `cms migrate`           | Print or run database migrations                |
| `cms lint`              | Validate schema definitions                     |
| `cms doctor`            | Check project health                            |
| `cms collection create` | Scaffold a new collection                       |
| `cms plugin create`     | Scaffold a new plugin                           |

See [CLI Usage Guide](/docs/cli-usage.md) for detailed usage.
