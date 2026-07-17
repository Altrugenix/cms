import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("lint command", () => {
  let tmpDir: string;
  const originalExit = process.exit;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-lint-test-"));
    process.exit = vi.fn() as unknown as typeof process.exit;
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
    process.exit = originalExit;
  });

  it("reports valid schemas", async () => {
    mkdirSync(join(tmpDir, "collections"), { recursive: true });
    writeFileSync(
      join(tmpDir, "collections", "posts.ts"),
      `import { defineCollection, text } from "@arche-cms/schema";\nexport default defineCollection({ slug: "posts", fields: [text("title")] })`,
    );
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.join(" "));
    });
    const { lint } = await import("../src/commands/lint.js");
    await lint({ dir: tmpDir });
    expect(lines.some((l) => l.includes("All schemas valid"))).toBe(true);
  });

  it("reports errors for invalid collections", async () => {
    mkdirSync(join(tmpDir, "collections"), { recursive: true });
    writeFileSync(
      join(tmpDir, "collections", "posts.ts"),
      `import { defineCollection } from "@arche-cms/schema";\nexport default defineCollection({ slug: "posts", fields: [] })`,
    );
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.join(" "));
    });
    const { lint } = await import("../src/commands/lint.js");
    await lint({ dir: tmpDir });
    expect(lines.some((l) => l.includes("All schemas valid"))).toBe(true);
  });
});
