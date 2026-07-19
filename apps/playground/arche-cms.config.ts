import { defineConfig } from "@arche-cms/cms";
export default defineConfig({
  database: { adapter: "sqlite", url: "file:./cms.db" },
  localization: { defaultLocale: "en" },
});
