import { defineComponent, text, textarea } from "@arche-cms/schema";

export default defineComponent({
  fields: [
    text("title", { label: "SEO Title", validation: { required: true } }),
    textarea("description", { label: "Meta Description" }),
    text("ogImage", { label: "OG Image URL" }),
    text("canonicalUrl", { label: "Canonical URL" }),
  ],
  label: "SEO",
  slug: "seo",
});
