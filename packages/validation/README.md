# @altrugenix/validation

Zod validation schema generator. Auto-generates validation schemas from Altrugenix field definitions.

## Installation

```bash
yarn add @altrugenix/validation
```

## Usage

```ts
import { collectionToCreateSchema, collectionToUpdateSchema } from "@altrugenix/validation";
import type { CollectionDefinition } from "@altrugenix/types";

const collection: CollectionDefinition = {
  slug: "posts",
  fields: [
    { name: "title", type: "text", validation: { required: true, maxLength: 200 } },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    },
  ],
};

const createSchema = collectionToCreateSchema(collection);
const updateSchema = collectionToUpdateSchema(collection);

// Validate input
const result = createSchema.parse({ title: "Hello", status: "draft" });
```
