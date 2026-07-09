# @altrugenix/admin-ui

Shared admin UI components and blocks for the Altrugenix CMS admin panel. Built with React, shadcn/ui, and Tailwind CSS v4.

## Installation

```bash
yarn add @altrugenix/admin-ui
```

## Components

The package provides shared UI components used across the admin panel:

- Field inputs for all schema field types
- Relation picker (searchable select)
- Media picker (upload + preview)
- Data table with sorting, filtering, pagination
- Form builder utilities
- Theme provider (dark mode)
- Command palette

## Usage

```tsx
import { FieldInput } from "@altrugenix/admin-ui";
import type { FieldDefinition } from "@altrugenix/types";

function MyForm() {
  const field: FieldDefinition = { name: "title", type: "text", label: "Title" };
  return <FieldInput field={field} value={value} onChange={setValue} />;
}
```
