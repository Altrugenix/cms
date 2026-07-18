import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect, vi } from "vitest";

vi.mock("@arche-cms/validation", () => ({
  createMutationPayloadSchema: () => ({
    safeParse: (data: unknown) => ({ data, success: true }),
  }),
  updateMutationPayloadSchema: () => ({
    safeParse: (data: unknown) => ({ data, success: true }),
  }),
}));

const { generateResolvers } = await import("../src/resolvers.js");

const mockAdapter: DatabaseAdapter = {
  connect: async () => {},
  create: async () => ({}),
  createTable: async () => {},
  delete: async () => true,
  deleteMany: async () => 0,
  disconnect: async () => {},
  dropTable: async () => {},
  findMany: async () => ({ data: [], total: 0 }),
  findOne: async () => null,
  getExecutedMigrations: async () => [],
  getExistingSchema: async () => ({ tables: new Map() }),
  raw: async () => [],
  runMigration: async () => {},
  transaction: async <T>(fn: () => Promise<T>) => fn(),
  update: async () => null,
};

const localizedCollection: CollectionDefinition = {
  fields: [
    { localized: true, name: "title", type: "text" },
    { name: "body", type: "text" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  localization: {
    defaultLocale: "en",
    locales: ["en", "fr"],
  },
  slug: "posts",
};

const numericLocalizedCollection: CollectionDefinition = {
  fields: [
    { localized: true, name: "score", type: "number" },
    { name: "name", type: "text" },
  ],
  labels: { plural: "Items", singular: "Item" },
  localization: { defaultLocale: "en", locales: ["en"] },
  slug: "items",
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

    await resolvers.Mutation.createPosts({}, { data: { body: "World", title: "Hello" } });
    expect(capturedData).toEqual({
      body: "World",
      title: { en: "Hello" },
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

    await resolvers.Mutation.createItems({}, { data: { name: "test", score: 42 } });
    expect(capturedData).toEqual({
      name: "test",
      score: { en: 42 },
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

    await resolvers.Mutation.updatePosts({}, { data: { title: "Updated" }, id: "1" });
    expect(capturedData).toEqual(
      expect.objectContaining({
        title: { en: "Updated" },
      }),
    );
  });

  it("wraps localized primitive boolean value in locale object on create", async () => {
    const boolCollection: CollectionDefinition = {
      fields: [
        { localized: true, name: "active", type: "boolean" },
        { name: "label", type: "text" },
      ],
      labels: { plural: "Flags", singular: "Flag" },
      localization: { defaultLocale: "en", locales: ["en"] },
      slug: "flags",
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
      fields: [
        { localized: true, name: "tags", type: "json" },
        { name: "name", type: "text" },
      ],
      labels: { plural: "Lists", singular: "List" },
      localization: { defaultLocale: "en", locales: ["en"] },
      slug: "lists",
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

    await resolvers.Mutation.createLists({}, { data: { name: "test", tags: ["a", "b"] } });
    expect(capturedData).toEqual({
      name: "test",
      tags: { en: ["a", "b"] },
    });
  });
});
