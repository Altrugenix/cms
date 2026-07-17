import { describe, it, expect } from "vitest";

import {
  defineCollection,
  defineGlobal,
  defineComponent,
  text,
  textarea,
  number,
  boolean,
  date,
  email,
  password,
  url,
  json,
  richText,
  markdown,
  code,
  color,
  media,
  upload,
  select,
  multiSelect,
  radio,
  checkbox,
  relation,
  componentField,
  dynamicZone,
  arrayField,
  objectField,
  tabsField,
  groupField,
  repeater,
  slug,
  validateCollection,
} from "../src/index.js";

describe("defineCollection", () => {
  it("creates a collection with defaults", () => {
    const posts = defineCollection({
      fields: [text("title")],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    });
    expect(posts.slug).toBe("posts");
    expect(posts.labels.singular).toBe("Post");
    expect(posts.labels.plural).toBe("Posts");
    expect(posts.fields).toHaveLength(1);
    expect(posts.timestamps).toEqual({ createdAt: true, updatedAt: true });
  });
});

describe("defineGlobal", () => {
  it("creates a global definition", () => {
    const settings = defineGlobal({
      fields: [text("siteName")],
      label: "Site Settings",
      slug: "settings",
    });
    expect(settings.slug).toBe("settings");
    expect(settings.label).toBe("Site Settings");
  });
});

describe("defineComponent", () => {
  it("creates a component definition", () => {
    const seo = defineComponent({
      fields: [text("title"), textarea("description")],
      label: "SEO",
      slug: "seo",
    });
    expect(seo.slug).toBe("seo");
    expect(seo.fields).toHaveLength(2);
  });
});

describe("field helpers", () => {
  it("creates a text field", () => {
    const f = text("title", { label: "Title", validation: { required: true } });
    expect(f.name).toBe("title");
    expect(f.type).toBe("text");
    expect(f.label).toBe("Title");
    expect(f.validation?.required).toBe(true);
  });

  it("creates a textarea field", () => {
    const f = textarea("bio");
    expect(f.type).toBe("textarea");
  });

  it("creates a number field", () => {
    const f = number("age", { validation: { max: 150, min: 0 } });
    expect(f.type).toBe("number");
    expect(f.validation?.min).toBe(0);
  });

  it("creates a boolean field", () => {
    const f = boolean("published", { defaultValue: false });
    expect(f.type).toBe("boolean");
    expect(f.defaultValue).toBe(false);
  });

  it("creates a date field", () => {
    const f = date("publishedAt");
    expect(f.type).toBe("date");
  });

  it("creates an email field", () => {
    const f = email("userEmail");
    expect(f.type).toBe("email");
  });

  it("creates a password field", () => {
    const f = password("secret");
    expect(f.type).toBe("password");
  });

  it("creates a url field", () => {
    const f = url("website");
    expect(f.type).toBe("url");
  });

  it("creates a json field", () => {
    const f = json("metadata");
    expect(f.type).toBe("json");
  });

  it("creates a richText field", () => {
    const f = richText("content");
    expect(f.type).toBe("richText");
  });

  it("creates a markdown field", () => {
    const f = markdown("body");
    expect(f.type).toBe("markdown");
  });

  it("creates a code field", () => {
    const f = code("snippet", { language: "typescript" });
    expect(f.type).toBe("code");
    expect(f.language).toBe("typescript");
  });

  it("creates a color field", () => {
    const f = color("accent", { format: "hex" });
    expect(f.type).toBe("color");
    expect(f.format).toBe("hex");
  });

  it("creates a media field", () => {
    const f = media("image", { multiple: false });
    expect(f.type).toBe("media");
    expect(f.multiple).toBe(false);
  });

  it("creates an upload field", () => {
    const f = upload("file", { allowedTypes: ["document"] });
    expect(f.type).toBe("upload");
    expect(f.allowedTypes).toEqual(["document"]);
  });

  it("creates a select field", () => {
    const f = select("status", {
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    });
    expect(f.type).toBe("select");
    expect(f.options).toHaveLength(2);
  });

  it("creates a multiSelect field", () => {
    const f = multiSelect("tags", {
      options: [{ label: "News", value: "news" }],
    });
    expect(f.type).toBe("multiSelect");
  });

  it("creates a radio field", () => {
    const f = radio("choice", {
      options: [{ label: "Yes", value: "yes" }],
    });
    expect(f.type).toBe("radio");
  });

  it("creates a checkbox field", () => {
    const f = checkbox("agree");
    expect(f.type).toBe("checkbox");
  });

  it("creates a relation field", () => {
    const f = relation("author", { kind: "manyToOne", to: "users" });
    expect(f.type).toBe("relation");
    expect(f.to).toBe("users");
    expect(f.kind).toBe("manyToOne");
  });

  it("creates a component field", () => {
    const f = componentField("seo", { component: "seo" });
    expect(f.type).toBe("component");
    expect(f.component).toBe("seo");
  });

  it("creates a dynamicZone field", () => {
    const f = dynamicZone("blocks", { components: ["hero", "cta"] });
    expect(f.type).toBe("dynamicZone");
    expect(f.components).toEqual(["hero", "cta"]);
  });

  it("creates an array field", () => {
    const f = arrayField("items", { fields: [text("name"), number("qty")] });
    expect(f.type).toBe("array");
    expect(f.fields).toHaveLength(2);
  });

  it("creates an object field", () => {
    const f = objectField("address", { fields: [text("street"), text("city")] });
    expect(f.type).toBe("object");
  });

  it("creates a tabs field", () => {
    const f = tabsField("settings", {
      tabs: [
        { fields: [text("name")], label: "General" },
        { fields: [text("metaTitle")], label: "SEO" },
      ],
    });
    expect(f.type).toBe("tabs");
    expect(f.tabs).toHaveLength(2);
  });

  it("creates a group field", () => {
    const f = groupField("social", { fields: [url("facebook"), url("twitter")] });
    expect(f.type).toBe("group");
  });

  it("creates a repeater field", () => {
    const f = repeater("links", { fields: [text("label"), url("url")] });
    expect(f.type).toBe("repeater");
  });

  it("creates a slug field", () => {
    const f = slug("slug", { source: "title" });
    expect(f.type).toBe("slug");
    expect(f.source).toBe("title");
  });
});

describe("validateCollection", () => {
  it("validates a valid collection", () => {
    const result = validateCollection(
      defineCollection({
        fields: [text("title")],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      }),
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects collection with invalid slug", () => {
    const result = validateCollection({
      fields: [text("title")],
      labels: { plural: "Posts", singular: "Post" },
      slug: "Posts With Spaces",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "slug")).toBe(true);
  });

  it("rejects collection with duplicate field names", () => {
    const result = validateCollection({
      fields: [text("title"), text("title")],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
  });

  it("warns on empty fields", () => {
    const result = validateCollection({
      fields: [],
      labels: { plural: "Empties", singular: "Empty" },
      slug: "empty",
    });
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("rejects select field without options", () => {
    const result = validateCollection({
      fields: [select("status", { options: [] })],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects relation field without target", () => {
    const result = validateCollection({
      fields: [relation("author", { to: "" })],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid field name", () => {
    const result = validateCollection({
      fields: [text("123invalid")],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
  });
});
