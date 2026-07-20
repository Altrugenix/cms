import {
  defineGlobal,
  json,
  code,
  color,
  componentField,
  dynamicZone,
  arrayField,
  objectField,
  tabsField,
  groupField,
  repeater,
  text,
  richText,
} from "@arche-cms/schema";

export default defineGlobal({
  fields: [
    json("customSettings", { label: "Custom Settings (JSON)" }),
    code("customScript", { label: "Custom Script" }),
    color("primaryColor", { label: "Primary Brand Color" }),
    componentField("heroBanner", { component: "seo", label: "Hero Banner" }),
    dynamicZone("pageBlocks", {
      components: ["seo", "media-card"],
      label: "Page Blocks",
    }),
    arrayField("socialLinks", {
      fields: [text("platform", { label: "Platform" }), text("url", { label: "URL" })],
      label: "Social Links",
    }),
    objectField("contactInfo", {
      fields: [text("phone", { label: "Phone" }), text("address", { label: "Address" })],
      label: "Contact Info",
    }),
    tabsField("tabbedSettings", {
      label: "Tabbed Settings",
      tabs: [
        {
          fields: [
            text("tagline", { label: "Tagline" }),
            richText("welcomeMessage", { label: "Welcome Message" }),
          ],
          label: "General",
        },
        {
          fields: [
            code("customCss", { label: "Custom CSS" }),
            json("featureFlags", { label: "Feature Flags" }),
          ],
          label: "Advanced",
        },
      ],
    }),
    groupField("footerSettings", {
      fields: [
        text("copyright", { label: "Copyright Text" }),
        text("footerLinks", { label: "Footer Links" }),
      ],
      label: "Footer Settings",
    }),
    repeater("testimonials", {
      fields: [text("author", { label: "Author" }), richText("quote", { label: "Quote" })],
      label: "Testimonials",
    }),
  ],
  label: "Advanced Fields",
  slug: "advanced-fields",
});
