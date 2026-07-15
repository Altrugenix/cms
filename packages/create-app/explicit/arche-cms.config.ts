import { defineConfig } from "@arche-cms/cms";

export default defineConfig({
  database: { adapter: "explicit" },
  localization: { defaultLocale: "explicit" },
});
