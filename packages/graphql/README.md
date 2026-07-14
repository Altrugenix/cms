# @arche-cms/graphql

GraphQL schema generator. Auto-generates GraphQL types, queries, and mutations from Arche CMS schema definitions.

## Installation

```bash
yarn add @arche-cms/graphql
```

## Usage

Generate GraphQL schema SDL and resolvers:

```ts
import { generateSchema, generateTypeResolvers } from "@arche-cms/graphql";
import type { CollectionDefinition } from "@arche-cms/types";
import type { DatabaseAdapter } from "@arche-cms/database";

const collections: CollectionDefinition[] = [
  { slug: "posts", fields: [{ name: "title", type: "text" }] },
];

const sdl = generateSchema(collections);
const typeResolvers = generateTypeResolvers(collections, adapter);

// Merge with mutation resolvers
const resolvers = {
  Query: { ...typeResolvers.Query },
  Mutation: { ...typeResolvers.Mutation },
  ...typeResolvers,
};
```

## Generated Operations

For each collection:

### Queries

- `collection(slug: "<slug>", id: ID!): <Type>` — get by ID
- `list<Plural>(filter: <Filter>, sort: <Sort>, limit: Int, offset: Int): [<Type>]` — list with filtering

### Mutations

- `create<Name>(data: <CreateInput>!): <Type>` — create entry
- `update<Name>(id: ID!, data: <UpdateInput>!): <Type>` — update entry
- `delete<Name>(id: ID!): Boolean` — delete entry
