import { defineGlobal, slug, text } from "@arche-cms/schema";

export default defineGlobal({
  slug: "homepage",
  label: "Homepage",
  fields: [
    text("title", { label: "Title", validation: { required: true } }),
    slug("slug", { label: "Slug", validation: { required: true } }),
  ],
});
