# Plugin Development Guide

This guide explains how to create plugins for Arche CMS.

## Overview

Plugins extend CMS functionality through:

- **Custom fields** — add fields to any collection or global
- **Admin panels** — register custom admin UI pages
- **Lifecycle hooks** — run code before/after schema load, route registration, and requests
- **Custom routes** — register API endpoints

## Plugin Structure

A plugin is a module that exports a `PluginDefinition` as its default export:

```ts
// packages/my-plugin/src/index.ts
import type { PluginDefinition } from "@arche-cms/types";

const myPlugin: PluginDefinition = {
  slug: "my-plugin",
  name: "My Plugin",
  description: "Does something useful",
  version: "0.1.0",
};

export default myPlugin;
```

## Plugin Definition

| Property      | Type                                | Required | Description                               |
| ------------- | ----------------------------------- | -------- | ----------------------------------------- |
| `slug`        | `string`                            | Yes      | Unique identifier (lowercase, kebab-case) |
| `name`        | `string`                            | Yes      | Human-readable name                       |
| `description` | `string`                            | No       | Short description                         |
| `version`     | `string`                            | No       | Semver version                            |
| `hooks`       | `PluginHooks`                       | No       | Lifecycle hook functions                  |
| `fields`      | `Record<string, FieldDefinition[]>` | No       | Custom fields keyed by collection slug    |
| `adminPanels` | `AdminPanel[]`                      | No       | Custom admin UI pages                     |

## Adding Custom Fields

Use the `fields` property to add fields to collections. Use `"*"` as the key to add fields to all collections:

```ts
const seoPlugin: PluginDefinition = {
  slug: "seo",
  name: "SEO",
  fields: {
    "*": [
      { name: "metaTitle", type: "text", label: "Meta Title" },
      { name: "metaDescription", type: "textarea", label: "Meta Description" },
    ],
    posts: [{ name: "ogImage", type: "media", label: "Open Graph Image" }],
  },
};
```

## Using Hooks

Hooks let you run code at specific points in the CMS lifecycle:

```ts
const auditPlugin: PluginDefinition = {
  slug: "audit-log",
  name: "Audit Log",
  hooks: {
    beforeSchemaLoad: async (context) => {
      // Runs before schema files are loaded
    },
    afterSchemaLoad: async (context) => {
      // Runs after all schemas are loaded
    },
    beforeRouteRegister: async (context) => {
      // Runs before API routes are registered
    },
    afterRouteRegister: async (context) => {
      // Runs after all routes are registered
    },
    beforeRequest: async (context, request) => {
      // Runs before each request
    },
    afterRequest: async (context, response) => {
      // Runs after each response
    },
  },
};
```

## Adding Admin Panels

Register custom admin UI pages:

```ts
const analyticsPlugin: PluginDefinition = {
  slug: "analytics",
  name: "Analytics",
  adminPanels: [
    {
      slug: "analytics-dashboard",
      label: "Analytics",
      icon: "BarChart",
      component: "AnalyticsDashboard",
    },
    {
      slug: "analytics-settings",
      label: "Analytics Settings",
      icon: "Settings",
      component: "AnalyticsSettings",
    },
  ],
};
```

Admin panel components should be registered in the admin app's component registry.

## Official Plugins

Official plugins live in `packages/plugins/src/plugins/`. Each is a self-contained directory with its own `index.ts`. Reference them as models for your own plugins.

## Distribution

Plugins are distributed as npm packages. Name them following the convention:

- `@arche-cms/plugin-<name>` (scoped)
- `arche-cms-plugin-<name>` (unscoped)

The auto-discovery system in `@arche-cms/plugins` scans `node_modules` for both naming conventions and automatically registers discovered plugins.

## Scaffolding

Use the CLI to scaffold a new plugin:

```bash
cms plugin create my-plugin
```

This creates a minimal plugin skeleton with the correct structure and naming.
