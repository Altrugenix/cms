# @arche-cms/admin-ui

Shared admin UI components and blocks for the Arche CMS admin panel. Built with React, shadcn/ui, and Tailwind CSS v4.

## Installation

```bash
yarn add @arche-cms/admin-ui
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
import { FieldInput } from "@arche-cms/admin-ui";
import type { FieldDefinition } from "@arche-cms/types";

function MyForm() {
  const field: FieldDefinition = { name: "title", type: "text", label: "Title" };
  return <FieldInput field={field} value={value} onChange={setValue} />;
}
```
