import { defineGlobal, text, textarea, email, select } from "@arche-cms/schema";

export default defineGlobal({
  fields: [
    text("siteName", { label: "Site Name", required: true }),
    textarea("siteDescription", { label: "Site Description" }),
    email("adminEmail", { label: "Admin Email" }),
    select("defaultLocale", {
      label: "Default Locale",
      options: ["en", "fr", "es", "de", "ja", "zh"],
    }),
    text("seoTitle", { label: "SEO Default Title" }),
    textarea("seoDescription", { label: "SEO Default Description" }),
  ],
  label: "Site Settings",
  slug: "site-settings",
});
