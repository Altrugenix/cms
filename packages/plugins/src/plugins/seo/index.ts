import type { PluginDefinition } from "@altrugenix/types";

const seoPlugin: PluginDefinition = {
  slug: "seo",
  name: "SEO",
  description:
    "Adds meta fields (metaTitle, metaDescription, metaImage, og fields) to collections and generates sitemap.xml",
  version: "0.1.0",
  fields: {
    "*": [
      {
        name: "metaTitle",
        type: "text",
        label: "Meta Title",
        admin: { description: "Overrides the page title for search engines" },
      },
      {
        name: "metaDescription",
        type: "textarea",
        label: "Meta Description",
        admin: { description: "Short description for search results" },
      },
      {
        name: "metaImage",
        type: "media",
        label: "Social Share Image",
        admin: { description: "Open Graph / Twitter card image" },
      },
      { name: "metaKeywords", type: "text", label: "Meta Keywords" },
      { name: "isIndexed", type: "boolean", label: "Allow Indexing", defaultValue: true },
      { name: "canonicalUrl", type: "url", label: "Canonical URL" },
    ],
  },
  adminPanels: [
    { slug: "seo-settings", label: "SEO Settings", icon: "Search", component: "SEOSettings" },
  ],
};

export default seoPlugin;
