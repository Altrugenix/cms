import { defineCollection, slug, text } from "@arche-cms/schema";

export default defineCollection({
  fields: [
    text("title", { label: "Title", validation: { required: true } }),
    slug("slug", { label: "Slug", source: "title", validation: { required: true } }),
  ],
  labels: { plural: "Blogs", singular: "Blog" },
  slug: "blog",
});
