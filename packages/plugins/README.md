# @altrugenix/plugins

Plugin system for Altrugenix CMS. Includes the plugin registry, auto-discovery, hook system, extension points, and official plugins.

## Installation

```bash
yarn add @altrugenix/plugins
```

## Usage

### PluginManager

Central registry for managing plugins:

```ts
import { PluginManager, seoPlugin, auditLogPlugin } from "@altrugenix/plugins";
import { EventBus, Lifecycle, createLogger } from "@altrugenix/core";

const pm = new PluginManager({
  eventBus: new EventBus(),
  lifecycle: new Lifecycle(),
  context: {
    config: {},
    logger: createLogger({ level: "info" }),
    container: {},
  },
});

pm.register(seoPlugin);
pm.register(auditLogPlugin);

await pm.initPlugins();
```

### Auto-Discovery

Discover plugins installed in `node_modules`:

```ts
import { discoverPlugins } from "@altrugenix/plugins";

const discovered = await discoverPlugins();
for (const plugin of discovered) {
  pm.register(plugin.definition);
}
```

Plugins are discovered by the prefixes `@altrugenix/plugin-*` and `altrugenix-plugin-*`.

### Hook System

```ts
// Before/after schema loading
await pm.runHook("beforeSchemaLoad");
await pm.runHook("afterSchemaLoad");

// Before/after route registration
await pm.runRouteHook("beforeRouteRegister");
await pm.runRouteHook("afterRouteRegister");

// Per-request hooks
await pm.runRequestHook("beforeRequest", request);
await pm.runRequestHook("afterRequest", response);
```

### Extension Points

```ts
// Get custom fields added by plugins
const fields = pm.getCustomFields();
// { posts: [{ name: "metaTitle", type: "text" }, ...] }

// Get admin panels registered by plugins
const panels = pm.getAdminPanels();
// [{ slug: "seo-settings", label: "SEO Settings", plugin: "seo" }]
```

## Official Plugins

- **SEO** — meta fields (title, description, image, keywords) for collections
- **Audit Log** — tracks mutations with before/after snapshots
- **Webhooks** — triggers HTTP calls on collection events
- **Search** — full-text search integration across collections
- **Comments** — threaded comments with moderation support
- **Analytics** — basic page view tracking dashboard
