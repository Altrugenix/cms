import { defineComponent, text } from "@arche-cms/schema";

export default defineComponent({
  fields: [text("title", { label: "Title", validation: { required: true } })],
  label: "Test",
  slug: "test",
});
