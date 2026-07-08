import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { SchemaWatcher, type SchemaChangeEvent } from "../src/index.js";

const testDir = resolve(tmpdir(), `cms-watcher-test-${Date.now()}`);

beforeEach(async () => {
  await rm(testDir, { recursive: true, force: true });
  await mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

async function createSchema(dir: string, slug: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, `${slug}.ts`),
    `export default { slug: "${slug}", labels: { singular: "${slug}", plural: "${slug}s" }, fields: [] }`,
    "utf-8",
  );
}

function assertEvent(events: SchemaChangeEvent[], slug: string): SchemaChangeEvent {
  const event = events.find((e) => e.slug === slug);
  expect(event).toBeDefined();
  return event as SchemaChangeEvent;
}

describe("SchemaWatcher", () => {
  it("emits change event when a collection file is created", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await watcher.start();
    await createSchema(resolve(testDir, "collections"), "posts");
    await new Promise((r) => setTimeout(r, 500));

    expect(events.length).toBeGreaterThan(0);
    const event = assertEvent(events, "posts");
    expect(event.category).toBe("collections");

    await watcher.stop();
  });

  it("emits change event when a global file is created", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await watcher.start();
    await createSchema(resolve(testDir, "globals"), "site-settings");
    await new Promise((r) => setTimeout(r, 500));

    const event = assertEvent(events, "site-settings");
    expect(event.category).toBe("globals");
    expect(event.definition).toBeDefined();
    expect((event.definition as Record<string, unknown>)?.slug).toBe("site-settings");

    await watcher.stop();
  });

  it("emits change event when a component file is created", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await watcher.start();
    await createSchema(resolve(testDir, "components"), "hero");
    await new Promise((r) => setTimeout(r, 500));

    const event = assertEvent(events, "hero");
    expect(event.category).toBe("components");

    await watcher.stop();
  });

  it("ignores non-schema files", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await watcher.start();
    await mkdir(resolve(testDir, "collections"), { recursive: true });
    await writeFile(resolve(testDir, "collections", "notes.txt"), "hello", "utf-8");
    await new Promise((r) => setTimeout(r, 500));

    const notesEvents = events.filter((e) => e.slug === "notes");
    expect(notesEvents).toHaveLength(0);

    await watcher.stop();
  });
});
