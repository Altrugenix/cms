import { describe, it, expect, vi } from "vitest";
import type { CollectionDefinition } from "@arche-cms/types";
import type { DatabaseAdapter } from "@arche-cms/database";

vi.mock("@arche-cms/validation", () => ({
  createMutationPayloadSchema: () => ({
    parse: (data: unknown) => data,
  }),
  updateMutationPayloadSchema: () => ({
    parse: (data: unknown) => data,
  }),
}));

const { generateResolvers } = await import("../src/resolvers.js");

const mockAdapter: DatabaseAdapter = {
  findOne: async () => null,
  findMany: async () => ({ data: [], total: 0 }),
  create: async () => ({}),
  update: async () => null,
  delete: async () => true,
  connect: async () => {},
  disconnect: async () => {},
  transaction: async <T>(fn: () => Promise<T>) => fn(),
  raw: async () => [],
  createTable: async () => {},
  dropTable: async () => {},
  runMigration: async () => {},
  getExecutedMigrations: async () => [],
  getExistingSchema: async () => ({ tables: new Map() }),
  deleteMany: async () => 0,
};

const localizedCollection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "body", type: "text" },
  ],
  localization: {
    locales: ["en", "fr"],
    defaultLocale: "en",
  },
};

const numericLocalizedCollection: CollectionDefinition = {
  slug: "items",
  labels: { singular: "Item", plural: "Items" },
  fields: [
    { name: "score", type: "number", localized: true },
    { name: "name", type: "text" },
  ],
  localization: { locales: ["en"], defaultLocale: "en" },
};

describe("normalizeLocaleData - wrapping primitive localized values", () => {
  it("wraps localized primitive string value in locale object on create", async () => {
    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      create: async (_table: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Mutation.createPosts({}, { data: { title: "Hello", body: "World" } });
    expect(capturedData).toEqual({
      title: { en: "Hello" },
      body: "World",
    });
  });

  it("wraps localized primitive number value in locale object on create", async () => {
    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      create: async (_table: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([numericLocalizedCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Mutation.createItems({}, { data: { score: 42, name: "test" } });
    expect(capturedData).toEqual({
      score: { en: 42 },
      name: "test",
    });
  });

  it("wraps localized primitive value in locale object on update", async () => {
    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      update: async (_table: string, _id: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Mutation.updatePosts({}, { id: "1", data: { title: "Updated" } });
    expect(capturedData).toEqual(
      expect.objectContaining({
        title: { en: "Updated" },
      }),
    );
  });

  it("wraps localized primitive boolean value in locale object on create", async () => {
    const boolCollection: CollectionDefinition = {
      slug: "flags",
      labels: { singular: "Flag", plural: "Flags" },
      fields: [
        { name: "active", type: "boolean", localized: true },
        { name: "label", type: "text" },
      ],
      localization: { locales: ["en"], defaultLocale: "en" },
    };

    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      create: async (_table: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([boolCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Mutation.createFlags({}, { data: { active: true, label: "test" } });
    expect(capturedData).toEqual({
      active: { en: true },
      label: "test",
    });
  });

  it("wraps array localized value in locale object on create", async () => {
    const arrayCollection: CollectionDefinition = {
      slug: "lists",
      labels: { singular: "List", plural: "Lists" },
      fields: [
        { name: "tags", type: "json", localized: true },
        { name: "name", type: "text" },
      ],
      localization: { locales: ["en"], defaultLocale: "en" },
    };

    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      create: async (_table: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([arrayCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Mutation.createLists({}, { data: { tags: ["a", "b"], name: "test" } });
    expect(capturedData).toEqual({
      tags: { en: ["a", "b"] },
      name: "test",
    });
  });
});
