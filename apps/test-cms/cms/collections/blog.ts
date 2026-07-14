import { defineCollection, slug, text } from "@arche-cms/schema";

export default defineCollection({
  slug: "blog",
  labels: { singular: "", plural: "s" },
  fields: [
    text("title", { label: "Title", validation: { required: true } }),
    slug("slug", { label: "Slug", validation: { required: true }, source: "title" }),
  ],
});
