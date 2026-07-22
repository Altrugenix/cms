import { defineCollection, text, slug, richText, select } from "@arche-cms/schema";
export default defineCollection({
  fields: [
    text("title"),
    slug("slug", { source: "title" }),
    richText("content"),
    select("status", {
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    }),
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
});
