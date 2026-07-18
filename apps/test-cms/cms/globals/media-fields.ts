import { defineGlobal, media, upload } from "@arche-cms/schema";

export default defineGlobal({
  fields: [media("field_1"), upload("field_2")],
  label: "Media Fields",
  slug: "media-fields",
});
