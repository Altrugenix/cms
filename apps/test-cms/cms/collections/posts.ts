import { defineCollection, text, slug, richText, select } from "@arche-cms/schema";
export default defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    text("title"),
    slug("slug", { source: "title" }),
    richText("content"),
    select("status", { options: ["draft", "published"], defaultValue: "draft" }),
  ],
});
