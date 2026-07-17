import type { FieldDefinition, CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import {
  fieldToZodSchema,
  collectionToCreateSchema,
  collectionToUpdateSchema,
} from "../src/generator.js";

describe("fieldToZodSchema", () => {
  it("maps text to string", () => {
    const field: FieldDefinition = { name: "title", type: "text" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("hello")).toBe("hello");
    expect(() => schema.parse(123)).toThrow();
  });

  it("maps number to number", () => {
    const field: FieldDefinition = { name: "count", type: "number" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse(42)).toBe(42);
    expect(() => schema.parse("foo")).toThrow();
  });

  it("maps boolean to boolean", () => {
    const field: FieldDefinition = { name: "active", type: "boolean" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse(true)).toBe(true);
    expect(() => schema.parse("true")).toThrow();
  });

  it("maps email to email string", () => {
    const field: FieldDefinition = { name: "email", type: "email" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("test@example.com")).toBe("test@example.com");
    expect(() => schema.parse("not-an-email")).toThrow();
  });

  it("maps url to url string", () => {
    const field: FieldDefinition = { name: "website", type: "url" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("https://example.com")).toBe("https://example.com");
    expect(() => schema.parse("not-a-url")).toThrow();
  });

  it("maps select to enum", () => {
    const field: FieldDefinition = {
      name: "status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      type: "select",
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("draft")).toBe("draft");
    expect(schema.parse("published")).toBe("published");
    expect(() => schema.parse("archived")).toThrow();
  });

  it("maps multiSelect to string array", () => {
    const field: FieldDefinition = {
      name: "tags",
      options: [{ label: "News", value: "news" }],
      type: "multiSelect",
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse(["news"])).toEqual(["news"]);
    expect(() => schema.parse("news")).toThrow();
  });

  it("makes required fields required", () => {
    const field: FieldDefinition = { name: "title", type: "text", validation: { required: true } };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("hello")).toBe("hello");
    expect(() => schema.parse(undefined)).toThrow();
  });

  it("makes non-required fields optional", () => {
    const field: FieldDefinition = { name: "title", type: "text" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("hello")).toBe("hello");
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("applies minLength validation", () => {
    const field: FieldDefinition = { name: "title", type: "text", validation: { minLength: 3 } };
    const schema = fieldToZodSchema(field);
    expect(() => schema.parse("ab")).toThrow();
    expect(schema.parse("abc")).toBe("abc");
  });

  it("applies maxLength validation", () => {
    const field: FieldDefinition = { name: "title", type: "text", validation: { maxLength: 5 } };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("hello")).toBe("hello");
    expect(() => schema.parse("hello world")).toThrow();
  });

  it("applies min validation for numbers", () => {
    const field: FieldDefinition = { name: "age", type: "number", validation: { min: 18 } };
    const schema = fieldToZodSchema(field);
    expect(schema.parse(18)).toBe(18);
    expect(schema.parse(25)).toBe(25);
    expect(() => schema.parse(17)).toThrow();
  });

  it("applies max validation for numbers", () => {
    const field: FieldDefinition = { name: "age", type: "number", validation: { max: 99 } };
    const schema = fieldToZodSchema(field);
    expect(schema.parse(50)).toBe(50);
    expect(() => schema.parse(100)).toThrow();
  });

  it("applies regex pattern validation", () => {
    const field: FieldDefinition = {
      name: "code",
      type: "text",
      validation: { pattern: "^[A-Z]{3}$" },
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("ABC")).toBe("ABC");
    expect(() => schema.parse("abc")).toThrow();
  });

  it("maps json to record", () => {
    const field: FieldDefinition = { name: "metadata", type: "json" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse({ key: "value" })).toEqual({ key: "value" });
  });

  it("maps date/datetime to string", () => {
    const dateField: FieldDefinition = { name: "publishedAt", type: "date" };
    const dtField: FieldDefinition = { name: "createdAt", type: "datetime" };
    const dateSchema = fieldToZodSchema(dateField);
    expect(dateSchema.parse("2026-01-01")).toBe("2026-01-01");
    expect(() => dateSchema.parse(42)).toThrow();
    const dtSchema = fieldToZodSchema(dtField);
    expect(dtSchema.parse("2026-01-01T12:00:00Z")).toBe("2026-01-01T12:00:00Z");
  });

  it("maps checkbox to boolean", () => {
    const field: FieldDefinition = { name: "agree", type: "checkbox" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse(true)).toBe(true);
    expect(() => schema.parse("true")).toThrow();
  });

  it("maps relation to string (optional)", () => {
    const field: FieldDefinition = { name: "author", to: "users", type: "relation" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("abc123")).toBe("abc123");
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("maps component to record", () => {
    const field: FieldDefinition = { component: "seo", name: "seo", type: "component" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse({ title: "Test" })).toEqual({ title: "Test" });
  });

  it("maps dynamicZone to array", () => {
    const field: FieldDefinition = {
      components: ["hero", "cta"],
      name: "blocks",
      type: "dynamicZone",
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse([{ type: "hero" }])).toEqual([{ type: "hero" }]);
    expect(() => schema.parse("not-array")).toThrow();
  });

  it("maps array field with sub-fields", () => {
    const field: FieldDefinition = {
      fields: [
        { name: "name", type: "text" },
        { name: "quantity", type: "number" },
      ],
      name: "items",
      type: "array",
    };
    const schema = fieldToZodSchema(field);
    const valid = [{ name: "foo", quantity: 2 }];
    expect(schema.parse(valid)).toEqual(valid);
  });

  it("maps object field with sub-fields", () => {
    const field: FieldDefinition = {
      fields: [
        { name: "street", type: "text" },
        { name: "zip", type: "text" },
      ],
      name: "address",
      type: "object",
    };
    const schema = fieldToZodSchema(field);
    const valid = { street: "123 Main", zip: "12345" };
    expect(schema.parse(valid)).toEqual(valid);
  });
});

describe("collectionToCreateSchema", () => {
  it("generates schema with required and optional fields", () => {
    const collection: CollectionDefinition = {
      fields: [
        { name: "title", type: "text", validation: { required: true } },
        { name: "body", type: "richText" },
      ],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const schema = collectionToCreateSchema(collection);
    const valid = { body: "World", title: "Hello" };
    expect(schema.parse(valid)).toEqual(valid);
    expect(() => schema.parse({ body: "World" })).toThrow();
    expect(schema.parse({ title: "Hello" })).toEqual({ title: "Hello" });
  });
});

describe("fieldToZodSchema — additional field type coverage", () => {
  it("maps password to string with 8 char minimum", () => {
    const field: FieldDefinition = { name: "pw", type: "password" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("s3cret123")).toBe("s3cret123");
    expect(() => schema.parse(123)).toThrow();
    expect(() => schema.parse("short")).toThrow();
  });

  it("maps media to string", () => {
    const field: FieldDefinition = { name: "img", type: "media" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("/uploads/photo.jpg")).toBe("/uploads/photo.jpg");
    expect(() => schema.parse(42)).toThrow();
  });

  it("maps upload to string", () => {
    const field: FieldDefinition = { name: "file", type: "upload" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("/uploads/doc.pdf")).toBe("/uploads/doc.pdf");
  });

  it("maps radio with options to enum", () => {
    const field: FieldDefinition = {
      name: "choice",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
      type: "radio",
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("yes")).toBe("yes");
    expect(() => schema.parse("maybe")).toThrow();
  });

  it("maps select without options to string", () => {
    const field: FieldDefinition = { name: "status", type: "select" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("anything")).toBe("anything");
  });

  it("maps array without sub-fields to array of records", () => {
    const field: FieldDefinition = { name: "items", type: "array" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse([{ key: "val" }])).toEqual([{ key: "val" }]);
  });

  it("maps repeater without sub-fields to array of records", () => {
    const field: FieldDefinition = { name: "rows", type: "repeater" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse([{ a: 1 }])).toEqual([{ a: 1 }]);
  });

  it("maps object without sub-fields to record", () => {
    const field: FieldDefinition = { name: "meta", type: "object" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse({ any: "value" })).toEqual({ any: "value" });
  });

  it("maps group without sub-fields to record", () => {
    const field: FieldDefinition = { name: "settings", type: "group" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse({ enabled: true })).toEqual({ enabled: true });
  });

  it("maps tabs with sub-fields to object", () => {
    const field: FieldDefinition = {
      name: "seo",
      tabs: [
        { fields: [{ name: "title", type: "text" }], label: "General" },
        { fields: [{ name: "image", type: "text" }], label: "Social" },
      ],
      type: "tabs",
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse({ image: "img.png", title: "Hello" })).toEqual({
      image: "img.png",
      title: "Hello",
    });
  });

  it("maps tabs without tabs prop to record", () => {
    const field: FieldDefinition = { name: "seo", type: "tabs" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse({ any: "val" })).toEqual({ any: "val" });
  });

  it("maps group with sub-fields to object", () => {
    const field: FieldDefinition = {
      fields: [
        { name: "street", type: "text" },
        { name: "zip", type: "text" },
      ],
      name: "address",
      type: "group",
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse({ street: "123 Main", zip: "12345" })).toEqual({
      street: "123 Main",
      zip: "12345",
    });
  });

  it("maps unknown field type to z.unknown", () => {
    const field: FieldDefinition = { name: "custom", type: "unknown" as never };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("any")).toBe("any");
    expect(schema.parse(42)).toBe(42);
    expect(schema.parse({})).toEqual({});
  });
});

describe("fieldToZodSchema — localization", () => {
  it("wraps localized field in record when localize=true", () => {
    const field: FieldDefinition = { localized: true, name: "title", type: "text" };
    const schema = fieldToZodSchema(field, true);
    expect(schema.parse({ en: "Hello", fr: "Bonjour" })).toEqual({ en: "Hello", fr: "Bonjour" });
    expect(() => schema.parse("not-a-record")).toThrow();
  });

  it("does not wrap non-localized field when localize=true", () => {
    const field: FieldDefinition = { name: "title", type: "text" };
    const schema = fieldToZodSchema(field, true);
    expect(schema.parse("Hello")).toBe("Hello");
  });

  it("does not wrap localized field when localize=false", () => {
    const field: FieldDefinition = { localized: true, name: "title", type: "text" };
    const schema = fieldToZodSchema(field, false);
    expect(schema.parse("Hello")).toBe("Hello");
  });
});

describe("fieldToZodSchema — custom validation", () => {
  it("applies custom refine function", () => {
    const field: FieldDefinition = {
      name: "even",
      type: "number",
      validation: {
        custom: (v: unknown) => typeof v === "number" && v % 2 === 0,
      },
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse(4)).toBe(4);
    expect(() => schema.parse(3)).toThrow();
  });
});

describe("fieldToZodSchema — pattern on email/url", () => {
  it("applies regex pattern to email", () => {
    const field: FieldDefinition = {
      name: "email",
      type: "email",
      validation: { pattern: "^[a-z]+@example\\.com$" },
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("test@example.com")).toBe("test@example.com");
    expect(() => schema.parse("Test@Example.com")).toThrow();
    expect(() => schema.parse("test@other.com")).toThrow();
  });

  it("applies regex pattern to url", () => {
    const field: FieldDefinition = {
      name: "site",
      type: "url",
      validation: { pattern: "^https://" },
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("https://example.com")).toBe("https://example.com");
    expect(() => schema.parse("http://example.com")).toThrow();
  });
});

describe("fieldToZodSchema — combined validators", () => {
  it("applies minLength + maxLength + pattern simultaneously", () => {
    const field: FieldDefinition = {
      name: "username",
      type: "text",
      validation: { maxLength: 10, minLength: 3, pattern: "^[a-zA-Z][a-zA-Z0-9]+$" },
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("Alice42")).toBe("Alice42");
    expect(() => schema.parse("ab")).toThrow();
    expect(() => schema.parse("ThisNameIsWayTooLong")).toThrow();
    expect(() => schema.parse("123abc")).toThrow();
  });
});

describe("fieldToZodSchema — custom validation messages", () => {
  it("uses custom message for minLength", () => {
    const field: FieldDefinition = {
      name: "name",
      type: "text",
      validation: { message: "Too short!", minLength: 3 },
    };
    const schema = fieldToZodSchema(field);
    expect(() => schema.parse("ab")).toThrow("Too short!");
  });

  it("uses custom message for maxLength", () => {
    const field: FieldDefinition = {
      name: "name",
      type: "text",
      validation: { maxLength: 5, message: "Too long!" },
    };
    const schema = fieldToZodSchema(field);
    expect(() => schema.parse("abcdef")).toThrow("Too long!");
  });

  it("uses custom message for number min", () => {
    const field: FieldDefinition = {
      name: "age",
      type: "number",
      validation: { message: "Must be 18+", min: 18 },
    };
    const schema = fieldToZodSchema(field);
    expect(() => schema.parse(15)).toThrow("Must be 18+");
  });

  it("uses custom message for number max", () => {
    const field: FieldDefinition = {
      name: "age",
      type: "number",
      validation: { max: 99, message: "Too old!" },
    };
    const schema = fieldToZodSchema(field);
    expect(() => schema.parse(100)).toThrow("Too old!");
  });

  it("uses custom message for pattern", () => {
    const field: FieldDefinition = {
      name: "code",
      type: "text",
      validation: { message: "Uppercase only", pattern: "^[A-Z]+$" },
    };
    const schema = fieldToZodSchema(field);
    expect(() => schema.parse("abc")).toThrow("Uppercase only");
  });
});

describe("collectionToCreateSchema — extras", () => {
  it("includes _status field when drafts enabled", () => {
    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { drafts: true },
    };
    const schema = collectionToCreateSchema(collection);
    expect(schema.parse({ _status: "draft", title: "Hello" })).toEqual({
      _status: "draft",
      title: "Hello",
    });
    expect(schema.parse({ _status: "published", title: "Hello" })).toEqual({
      _status: "published",
      title: "Hello",
    });
    expect(() => schema.parse({ _status: "invalid", title: "Hello" })).toThrow();
  });

  it("includes _publishAt field when scheduledPublishing enabled", () => {
    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { drafts: false, scheduledPublishing: true },
    };
    const schema = collectionToCreateSchema(collection);
    expect(schema.parse({ _publishAt: "2026-01-01T00:00:00Z", title: "Hello" })).toEqual({
      _publishAt: "2026-01-01T00:00:00Z",
      title: "Hello",
    });
  });

  it("includes both _status and _publishAt when both enabled", () => {
    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { drafts: true, scheduledPublishing: true },
    };
    const schema = collectionToCreateSchema(collection);
    const parsed = schema.parse({
      _publishAt: "2026-06-01T00:00:00Z",
      _status: "draft",
      title: "Hello",
    });
    expect(parsed).toEqual({
      _publishAt: "2026-06-01T00:00:00Z",
      _status: "draft",
      title: "Hello",
    });
  });
});

describe("collectionToUpdateSchema — extras", () => {
  it("includes _status field when drafts enabled", () => {
    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { drafts: true },
    };
    const schema = collectionToUpdateSchema(collection);
    expect(schema.parse({ _status: "draft" })).toEqual({ _status: "draft" });
    expect(schema.parse({})).toEqual({});
  });

  it("includes _publishAt field when scheduledPublishing enabled", () => {
    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { drafts: false, scheduledPublishing: true },
    };
    const schema = collectionToUpdateSchema(collection);
    expect(schema.parse({ _publishAt: "2026-01-01T00:00:00Z" })).toEqual({
      _publishAt: "2026-01-01T00:00:00Z",
    });
  });
});

describe("fieldToZodSchema — P3 validation hardening", () => {
  it("validates date field with ISO 8601 format (YYYY-MM-DD)", () => {
    const field: FieldDefinition = { name: "publishedAt", type: "date" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("2026-01-01")).toBe("2026-01-01");
    expect(() => schema.parse("01-01-2026")).toThrow();
    expect(() => schema.parse("Jan 1, 2026")).toThrow();
    expect(() => schema.parse("2026/01/01")).toThrow();
  });

  it("validates datetime field with ISO 8601 format", () => {
    const field: FieldDefinition = { name: "createdAt", type: "datetime" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("2026-01-01T12:00:00Z")).toBe("2026-01-01T12:00:00Z");
    expect(schema.parse("2026-01-01T12:00:00.000Z")).toBe("2026-01-01T12:00:00.000Z");
    expect(() => schema.parse("2026-01-01")).toThrow();
    expect(() => schema.parse("not-a-date")).toThrow();
  });

  it("validates color field with hex format by default", () => {
    const field: FieldDefinition = { name: "accent", type: "color" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("#ff0000")).toBe("#ff0000");
    expect(schema.parse("#fff")).toBe("#fff");
    expect(() => schema.parse("red")).toThrow();
    expect(() => schema.parse("rgb(255,0,0)")).toThrow();
  });

  it("validates color field with rgb format", () => {
    const field: FieldDefinition = { format: "rgb", name: "accent", type: "color" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
    expect(() => schema.parse("#ff0000")).toThrow();
  });

  it("validates color field with rgba format", () => {
    const field: FieldDefinition = { format: "rgba", name: "accent", type: "color" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("rgba(255, 0, 0, 0.5)")).toBe("rgba(255, 0, 0, 0.5)");
    expect(() => schema.parse("rgb(255,0,0)")).toThrow();
  });

  it("validates color field with hsl format", () => {
    const field: FieldDefinition = { format: "hsl", name: "accent", type: "color" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("hsl(0, 100%, 50%)")).toBe("hsl(0, 100%, 50%)");
    expect(() => schema.parse("#ff0000")).toThrow();
  });

  it("validates slug field with URL-safe format", () => {
    const field: FieldDefinition = { name: "slug", type: "slug" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("hello-world")).toBe("hello-world");
    expect(schema.parse("abc123")).toBe("abc123");
    expect(() => schema.parse("Hello World")).toThrow();
    expect(() => schema.parse("hello_world")).toThrow();
    expect(() => schema.parse("  leading-space")).toThrow();
  });

  it("validates password field with minimum 8 characters", () => {
    const field: FieldDefinition = { name: "pw", type: "password" };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("longenough")).toBe("longenough");
    expect(schema.parse("12345678")).toBe("12345678");
    expect(() => schema.parse("short")).toThrow();
    expect(() => schema.parse("")).toThrow();
  });
});

describe("collection schemas with relation fields", () => {
  it("collectionToCreateSchema treats relation fields as optional strings", () => {
    const collection: CollectionDefinition = {
      fields: [
        { name: "title", type: "text", validation: { required: true } },
        { name: "author", to: "users", type: "relation" },
      ],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const schema = collectionToCreateSchema(collection);
    expect(schema.parse({ title: "Hello" })).toEqual({ title: "Hello" });
    expect(schema.parse({ author: "user-123", title: "Hello" })).toEqual({
      author: "user-123",
      title: "Hello",
    });
  });

  it("collectionToUpdateSchema treats relation fields as optional strings", () => {
    const collection: CollectionDefinition = {
      fields: [
        { name: "title", type: "text" },
        { name: "author", to: "users", type: "relation" },
      ],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const schema = collectionToUpdateSchema(collection);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ title: "Updated" })).toEqual({ title: "Updated" });
    expect(schema.parse({ author: "user-456" })).toEqual({ author: "user-456" });
  });
});
