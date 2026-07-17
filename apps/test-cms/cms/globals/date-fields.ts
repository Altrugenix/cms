import { defineGlobal, date, datetime } from "@arche-cms/schema";

export default defineGlobal({
  fields: [date("field_1"), datetime("field_2")],
  label: "Date Fields",
  slug: "date-fields",
});
