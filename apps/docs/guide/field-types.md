# Field Types

Arche CMS provides 29 field types covering a wide range of content modeling needs.

## Text & Rich Content

| Field      | Import              | Description                                           |
| ---------- | ------------------- | ----------------------------------------------------- |
| `text`     | `@arche-cms/schema` | Single-line text input                                |
| `textarea` | `@arche-cms/schema` | Multi-line text area                                  |
| `richText` | `@arche-cms/schema` | Rich text editor (Tiptap-based)                       |
| `markdown` | `@arche-cms/schema` | Markdown editor                                       |
| `code`     | `@arche-cms/schema` | Code editor with syntax highlighting                  |
| `slug`     | `@arche-cms/schema` | URL-friendly slug, auto-generated from a source field |

## Numeric & Boolean

| Field      | Import              | Description                      |
| ---------- | ------------------- | -------------------------------- |
| `number`   | `@arche-cms/schema` | Numeric input (integer or float) |
| `boolean`  | `@arche-cms/schema` | True/false toggle                |
| `checkbox` | `@arche-cms/schema` | Single checkbox                  |

## Date & Time

| Field      | Import              | Description              |
| ---------- | ------------------- | ------------------------ |
| `date`     | `@arche-cms/schema` | Date picker (YYYY-MM-DD) |
| `datetime` | `@arche-cms/schema` | Date and time picker     |

## Media & Files

| Field    | Import              | Description              |
| -------- | ------------------- | ------------------------ |
| `media`  | `@arche-cms/schema` | Single media/file upload |
| `upload` | `@arche-cms/schema` | Multiple file upload     |

## Choice Fields

| Field         | Import              | Description            |
| ------------- | ------------------- | ---------------------- |
| `select`      | `@arche-cms/schema` | Single-select dropdown |
| `multiSelect` | `@arche-cms/schema` | Multi-select dropdown  |
| `radio`       | `@arche-cms/schema` | Radio button group     |

## Relational

| Field      | Import              | Description                     |
| ---------- | ------------------- | ------------------------------- |
| `relation` | `@arche-cms/schema` | Reference to another collection |

## Structured

| Field            | Import              | Description                                      |
| ---------------- | ------------------- | ------------------------------------------------ |
| `componentField` | `@arche-cms/schema` | Reusable component instance                      |
| `dynamicZone`    | `@arche-cms/schema` | Dynamic zone (choose one of multiple components) |
| `arrayField`     | `@arche-cms/schema` | Array of sub-fields                              |
| `objectField`    | `@arche-cms/schema` | Grouped sub-fields                               |
| `groupField`     | `@arche-cms/schema` | Named field group                                |
| `tabsField`      | `@arche-cms/schema` | Tabbed interface for organizing fields           |
| `repeater`       | `@arche-cms/schema` | Repeatable set of fields                         |

## Utility

| Field      | Import              | Description                 |
| ---------- | ------------------- | --------------------------- |
| `email`    | `@arche-cms/schema` | Email input with validation |
| `password` | `@arche-cms/schema` | Password input              |
| `url`      | `@arche-cms/schema` | URL input with validation   |
| `json`     | `@arche-cms/schema` | JSON editor                 |
| `color`    | `@arche-cms/schema` | Color picker                |

## Validation

Each field supports validation options:

```ts
text("title", {
  validation: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: "^[a-zA-Z0-9 ]+$",
  },
});

number("age", {
  validation: {
    required: true,
    min: 0,
    max: 150,
  },
});
```

## Complete Example

```ts
import {
  defineCollection,
  text,
  number,
  boolean,
  date,
  email,
  url,
  json,
  richText,
  markdown,
  code,
  color,
  media,
  upload,
  select,
  multiSelect,
  radio,
  checkbox,
  relation,
  componentField,
  dynamicZone,
  arrayField,
  objectField,
  groupField,
  tabsField,
  repeater,
  slug,
  password,
} from "@arche-cms/schema";

export default defineCollection({
  slug: "examples",
  labels: { singular: "Example", plural: "Examples" },
  fields: [
    text("title", { validation: { required: true } }),
    textarea("description"),
    number("order", { validation: { min: 0 } }),
    boolean("featured"),
    date("publishDate"),
    email("contactEmail"),
    url("website"),
    json("metadata"),
    richText("content"),
    markdown("readme"),
    code("snippet", { language: "typescript" }),
    color("accentColor"),
    media("coverImage"),
    upload("gallery"),
    select("status", { options: ["draft", "published", "archived"] }),
    multiSelect("tags", { options: ["news", "tech", "design"] }),
    radio("layout", { options: ["default", "full-width", "compact"] }),
    checkbox("showInMenu"),
    relation("author", { to: "users" }),
    componentField("seo", { component: "seo" }),
    dynamicZone("blocks", { components: ["hero", "cta", "faq"] }),
    arrayField("links", { fields: [text("label"), url("url")] }),
    objectField("settings", { fields: [text("theme"), boolean("darkMode")] }),
    groupField("social", { fields: [url("twitter"), url("github")] }),
    tabsField("details", { tabs: [{ label: "Content", fields: ["title", "body"] }] }),
    repeater("faq", { fields: [text("question"), textarea("answer")] }),
    slug("slug", { from: "title" }),
    password("secretKey"),
  ],
});
```
