import { defineComponent, text } from "@arche-cms/schema";

export default defineComponent({
  fields: [
    text("heading", { label: "Heading", validation: { required: true } }),
    text("subheading", { label: "Subheading" }),
    text("backgroundImage", { label: "Background Image URL" }),
  ],
  label: "Hero",
  slug: "hero",
});
