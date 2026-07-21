import {
  array,
  component,
  defineGlobal,
  dynamicZone,
  group,
  object,
  repeater,
  tabs,
  text,
} from "@arche-cms/schema";

export default defineGlobal({
  fields: [
    array("field_1", {
      fields: [text("item_title"), text("item_subtitle")],
      label: "Array",
    }),
    object("field_2", {
      fields: [text("nested_title"), text("nested_value")],
      label: "Object",
    }),
    tabs("field_3", {
      label: "Tabs",
      tabs: [
        { fields: [text("tab1_title"), text("tab1_body")], label: "Tab One" },
        { fields: [text("tab2_title"), text("tab2_body")], label: "Tab Two" },
      ],
    }),
    group("field_4", {
      fields: [text("group_title"), text("group_description")],
      label: "Group",
    }),
    repeater("field_5", {
      fields: [text("repeater_title"), text("repeater_value")],
      label: "Repeater",
    }),
    component("field_6", {
      component: "hero",
      label: "Component",
    }),
    dynamicZone("field_7", {
      components: ["hero", "cta"],
      label: "Dynamic Zone",
    }),
  ],
  label: "Structure Fields",
  slug: "structure-fields",
});
