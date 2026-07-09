# @altrugenix/schema

Schema definition API for Altrugenix CMS. Define collections, globals, and components using a declarative field system.

## Installation

```bash
yarn add @altrugenix/schema
```

## Usage

### Define a Collection

```ts
import { defineCollection, text, slug, richText, select, relation } from "@altrugenix/schema";

export default defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    text("title", { required: true }),
    slug("slug", { from: "title" }),
    richText("content"),
    select("status", { options: ["draft", "published", "archived"] }),
    relation("author", { to: "users" }),
  ],
});
```

### Define a Global

```ts
import { defineGlobal, text, media } from "@altrugenix/schema";

export default defineGlobal({
  slug: "site-settings",
  label: "Site Settings",
  fields: [text("siteName"), media("logo")],
});
```

### Define a Component

```ts
import { defineComponent, text, url } from "@altrugenix/schema";

export default defineComponent({
  slug: "cta-block",
  label: "Call to Action",
  fields: [text("heading"), text("buttonLabel"), url("buttonUrl")],
});
```

### Schema Loader

Load schema files from the filesystem:

```ts
import { SchemaLoader } from "@altrugenix/schema";

const loader = new SchemaLoader({ baseDir: "./cms" });
const schemas = await loader.load();
// schemas.collections, schemas.globals, schemas.components
```

### Schema Validator

Validate collection definitions at runtime:

```ts
import { validateCollection } from "@altrugenix/schema";

const result = validateCollection(collectionDef);
if (!result.valid) {
  console.error(result.issues);
}
```

## Field Types

text, textarea, number, boolean, date, datetime, email, password, url, json, richText, markdown, code, color, media, upload, select, multiSelect, radio, checkbox, relation, component, dynamicZone, array, object, tabs, group, repeater, slug
