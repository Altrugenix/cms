import { defineComponent, text } from "@arche-cms/schema";

export default defineComponent({
  fields: [
    text("heading", { label: "Heading", validation: { required: true } }),
    text("body", { label: "Body" }),
    text("ctaLabel", { label: "CTA Label" }),
    text("ctaUrl", { label: "CTA URL" }),
  ],
  label: "CTA",
  slug: "cta",
});
