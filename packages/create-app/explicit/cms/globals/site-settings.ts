import { defineGlobal, text, textarea, media } from "@arche-cms/schema";

export default defineGlobal({
  slug: "site-settings",
  label: "Site Settings",
  fields: [text("siteName"), textarea("description"), media("logo")],
});
