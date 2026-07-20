import { defineComponent, text, select, boolean } from "@arche-cms/schema";

export default defineComponent({
  fields: [
    text("label", { label: "Button Label", validation: { required: true } }),
    text("url", { label: "URL", validation: { required: true } }),
    select("variant", {
      label: "Variant",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Ghost", value: "ghost" },
      ],
    }),
    boolean("openInNewTab", { label: "Open in New Tab" }),
  ],
  label: "Button",
  slug: "button",
});
