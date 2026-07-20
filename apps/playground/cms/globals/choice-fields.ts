import { defineGlobal, select, multiSelect, radio, checkbox } from "@arche-cms/schema";

export default defineGlobal({
  fields: [
    select("defaultStatus", {
      label: "Default Status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    }),
    multiSelect("enabledFeatures", {
      label: "Enabled Features",
      options: [
        { label: "Comments", value: "comments" },
        { label: "Search", value: "search" },
        { label: "Analytics", value: "analytics" },
        { label: "SEO", value: "seo" },
      ],
    }),
    radio("maintenanceMode", {
      label: "Maintenance Mode",
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
    }),
    checkbox("enableRegistration", { label: "Enable User Registration" }),
  ],
  label: "Choice Fields",
  slug: "choice-fields",
});
