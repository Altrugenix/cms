import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

import { SchemaWatcher, type SchemaChangeEvent } from "../src/index.js";

const testDir = resolve(tmpdir(), `cms-watcher-test-${Date.now()}`);

beforeEach(async () => {
  await rm(testDir, { force: true, recursive: true });
  await mkdir(testDir, { recursive: true });
  // Pre-create schema subdirectories so FSEvents doesn't miss events in new dirs
  await mkdir(resolve(testDir, "collections"), { recursive: true });
  await mkdir(resolve(testDir, "globals"), { recursive: true });
  await mkdir(resolve(testDir, "components"), { recursive: true });
});

afterAll(async () => {
  await rm(testDir, { force: true, recursive: true });
});

async function createSchema(dir: string, slug: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, `${slug}.ts`),
    `export default { slug: "${slug}", labels: { singular: "${slug}", plural: "${slug}s" }, fields: [] }`,
    "utf-8",
  );
  // Wait for the file to be settled on disk so the watcher can import it
  await new Promise((r) => setTimeout(r, 300));
}

async function waitForEvent(events: unknown[], timeout = 10000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (events.length === 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function startWatcher(watcher: SchemaWatcher): Promise<void> {
  await watcher.start();
  // Give the filesystem watcher time to register on macOS FSEvents
  await new Promise((r) => setTimeout(r, 500));
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

    await startWatcher(watcher);
    await createSchema(resolve(testDir, "collections"), "posts");
    await waitForEvent(events);

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

    await startWatcher(watcher);
    await createSchema(resolve(testDir, "globals"), "site-settings");
    await waitForEvent(events);

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

    await startWatcher(watcher);
    await createSchema(resolve(testDir, "components"), "hero");
    await waitForEvent(events);

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

    await startWatcher(watcher);
    await mkdir(resolve(testDir, "collections"), { recursive: true });
    await writeFile(resolve(testDir, "collections", "notes.txt"), "hello", "utf-8");
    // Wait briefly — no event expected, but we need to be sure the watcher had time to not fire
    await new Promise((r) => setTimeout(r, 600));

    const notesEvents = events.filter((e) => e.slug === "notes");
    expect(notesEvents).toHaveLength(0);

    await watcher.stop();
  });

  it("emits no event for .ts file in a non-category directory", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await startWatcher(watcher);
    await createSchema(resolve(testDir, "custom"), "foo");
    await new Promise((r) => setTimeout(r, 600));

    expect(events).toHaveLength(0);

    await watcher.stop();
  });

  it("creates baseDir when it does not exist", async () => {
    const uniqueDir = resolve(tmpdir(), `cms-watcher-mkdir-${randomUUID()}`);
    await rm(uniqueDir, { force: true, recursive: true });

    const watcher = new SchemaWatcher(uniqueDir);

    const { existsSync } = await import("node:fs");
    expect(existsSync(uniqueDir)).toBe(false);

    await watcher.start();

    expect(existsSync(uniqueDir)).toBe(true);

    await watcher.stop();
    await rm(uniqueDir, { force: true, recursive: true });
  });

  it("filters out non-string filenames (Buffer)", async () => {
    const events: SchemaChangeEvent[] = [];
    const mockWatcher = new (await import("node:events")).EventEmitter();

    vi.resetModules();
    vi.doMock("node:fs", async (importOriginal) => {
      const actual = await importOriginal<typeof import("node:fs")>();
      return {
        ...actual,
        watch: () => mockWatcher,
      };
    });

    const { SchemaWatcher: MockedWatcher } = await import("../src/index.js");
    const mockedWatcher = new MockedWatcher(testDir);

    mockedWatcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await mockedWatcher.start();

    mockWatcher.emit("change", "rename", Buffer.from("collections/posts.ts"));

    await new Promise((r) => setTimeout(r, 300));
    expect(events).toHaveLength(0);

    await mockedWatcher.stop();
    vi.doUnmock("node:fs");
    vi.resetModules();
  });

  it("propagates non-ENOENT errors from fs.watch", async () => {
    const uniqueDir = resolve(tmpdir(), `cms-watcher-eacces-${randomUUID()}`);
    await mkdir(uniqueDir, { recursive: true });

    const eaccesError = new Error("EACCES: permission denied") as NodeJS.ErrnoException;
    eaccesError.code = "EACCES";

    vi.resetModules();
    vi.doMock("node:fs", async (importOriginal) => {
      const actual = await importOriginal<typeof import("node:fs")>();
      return {
        ...actual,
        watch: () => {
          throw eaccesError;
        },
      };
    });

    const { SchemaWatcher: MockedWatcher } = await import("../src/index.js");

    const watcher = new MockedWatcher(uniqueDir);
    await expect(watcher.start()).rejects.toThrow("EACCES");

    vi.doUnmock("node:fs");
    vi.resetModules();
    await rm(uniqueDir, { force: true, recursive: true });
  });

  it("start() is idempotent — calling twice is a no-op", async () => {
    const watcher = new SchemaWatcher(testDir);

    await watcher.start();
    await watcher.start();

    await watcher.stop();
  });

  it("stop() clears internal state", async () => {
    const watcher = new SchemaWatcher(testDir);

    await watcher.start();

    // @ts-expect-error accessing private field for test
    expect(watcher.abortController).not.toBeNull();

    await watcher.stop();

    // @ts-expect-error accessing private field for test
    expect(watcher.abortController).toBeNull();
    // @ts-expect-error accessing private field for test
    expect(watcher.debounceTimers.size).toBe(0);
  });

  it("resets debounce timer on rapid changes to same file", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await startWatcher(watcher);

    const collectionsDir = resolve(testDir, "collections");
    await mkdir(collectionsDir, { recursive: true });
    const filePath = resolve(collectionsDir, "posts.ts");

    await writeFile(
      filePath,
      `export default { slug: "posts", labels: { singular: "Post", plural: "Posts" }, fields: [] }`,
      "utf-8",
    );

    await new Promise((r) => setTimeout(r, 50));

    await writeFile(
      filePath,
      `export default { slug: "posts", labels: { singular: "Post", plural: "Posts" }, fields: [{ name: "title", type: "text" }] }`,
      "utf-8",
    );

    await waitForEvent(events);

    expect(events).toHaveLength(1);
    expect(events[0].slug).toBe("posts");

    await watcher.stop();
  });

  it("clears pending debounce timers on stop", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await startWatcher(watcher);

    const collectionsDir = resolve(testDir, "collections");
    await mkdir(collectionsDir, { recursive: true });
    await writeFile(
      resolve(collectionsDir, "posts.ts"),
      `export default { slug: "posts", labels: { singular: "Post", plural: "Posts" }, fields: [] }`,
      "utf-8",
    );

    await new Promise((r) => setTimeout(r, 50));
    await watcher.stop();

    // @ts-expect-error accessing private field for test
    expect(watcher.debounceTimers.size).toBe(0);
  });

  it("handles module with named exports (no default)", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await startWatcher(watcher);

    const collectionsDir = resolve(testDir, "collections");
    await writeFile(
      resolve(collectionsDir, "pages.ts"),
      `export const slug = "pages"; export const labels = { singular: "Page", plural: "Pages" }; export const fields = [];`,
      "utf-8",
    );
    await new Promise((r) => setTimeout(r, 300));

    await waitForEvent(events);

    const event = events.find((e) => e.slug === "pages");
    expect(event?.category).toBe("collections");

    await watcher.stop();
  });

  it("falls back to filename slug when definition slug is undefined", async () => {
    const watcher = new SchemaWatcher(testDir);
    const events: SchemaChangeEvent[] = [];

    watcher.on("change", (event: SchemaChangeEvent) => {
      events.push(event);
    });

    await startWatcher(watcher);

    const collectionsDir = resolve(testDir, "collections");
    await writeFile(
      resolve(collectionsDir, "custom.ts"),
      `export default { slug: undefined, fields: [] }`,
      "utf-8",
    );
    await new Promise((r) => setTimeout(r, 300));

    await waitForEvent(events);

    const event = events.find((e) => e.slug === "custom");
    expect(event?.category).toBe("collections");

    await watcher.stop();
  });
});
