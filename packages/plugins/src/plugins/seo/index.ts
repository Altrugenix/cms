import type { PluginDefinition } from "@arche-cms/types";

const seoPlugin: PluginDefinition = {
  adminPanels: [
    { component: "SEOSettings", icon: "Search", label: "SEO Settings", slug: "seo-settings" },
  ],
  description:
    "Adds meta fields (metaTitle, metaDescription, metaImage, og fields) to collections and generates sitemap.xml",
  fields: {
    "*": [
      {
        admin: { description: "Overrides the page title for search engines" },
        label: "Meta Title",
        name: "metaTitle",
        type: "text",
      },
      {
        admin: { description: "Short description for search results" },
        label: "Meta Description",
        name: "metaDescription",
        type: "textarea",
      },
      {
        admin: { description: "Open Graph / Twitter card image" },
        label: "Social Share Image",
        name: "metaImage",
        type: "media",
      },
      { label: "Meta Keywords", name: "metaKeywords", type: "text" },
      { defaultValue: true, label: "Allow Indexing", name: "isIndexed", type: "boolean" },
      { label: "Canonical URL", name: "canonicalUrl", type: "url" },
    ],
  },
  name: "SEO",
  slug: "seo",
  version: "0.1.0",
};

export default seoPlugin;
