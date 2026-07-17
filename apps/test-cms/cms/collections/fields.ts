import {
  defineCollection,
  boolean,
  email,
  markdown,
  number,
  password,
  richText,
  slug,
  text,
  textarea,
  url,
} from "@arche-cms/schema";

export default defineCollection({
  fields: [
    text("field_1"),
    textarea("field_2"),
    number("field_3"),
    boolean("field_4"),
    email("field_5"),
    password("field_6"),
    url("field_7"),
    richText("field_8"),
    markdown("field_9"),
    slug("field_10"),
  ],
  labels: { plural: "Fieldss", singular: "Fields" },
  slug: "fields",
});
