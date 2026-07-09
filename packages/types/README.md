# @altrugenix/types

Shared TypeScript type definitions for Altrugenix CMS. Used by all packages to ensure type consistency across the framework.

## Installation

```bash
yarn add @altrugenix/types
```

## Key Types

### Collections & Fields

```ts
import type { CollectionDefinition, FieldDefinition, FieldType } from "@altrugenix/types";
```

### Plugins

```ts
import type { PluginDefinition, PluginHooks, PluginRegistration } from "@altrugenix/types";
```

### Core

```ts
import type { CMSContext, Logger, Lifecycle } from "@altrugenix/types";
```

### Database

```ts
import type { QueryOptions, SortOrder, PaginationMeta } from "@altrugenix/types";
```
