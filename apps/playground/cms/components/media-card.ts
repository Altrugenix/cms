import { defineComponent, text, media, select, textarea } from "@arche-cms/schema";

export default defineComponent({
  fields: [
    media("image", { label: "Image", validation: { required: true } }),
    text("title", { label: "Title", validation: { required: true } }),
    textarea("description", { label: "Description" }),
    select("layout", {
      label: "Layout",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
        { label: "Full", value: "full" },
      ],
    }),
  ],
  label: "Media Card",
  slug: "media-card",
});
