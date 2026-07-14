# @arche-cms/types

Shared TypeScript type definitions for Arche CMS. Used by all packages to ensure type consistency across the framework.

## Installation

```bash
yarn add @arche-cms/types
```

## Key Types

### Collections & Fields

```ts
import type { CollectionDefinition, FieldDefinition, FieldType } from "@arche-cms/types";
```

### Plugins

```ts
import type { PluginDefinition, PluginHooks, PluginRegistration } from "@arche-cms/types";
```

### Core

```ts
import type { CMSContext, Logger, Lifecycle } from "@arche-cms/types";
```

### Database

```ts
import type { QueryOptions, SortOrder, PaginationMeta } from "@arche-cms/types";
```
