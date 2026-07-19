import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function withLogCapture(fn: (lines: string[]) => Promise<void>): () => Promise<void> {
  return async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.join(" "));
    });
    try {
      await fn(lines);
    } finally {
      spy.mockRestore();
    }
  };
}

function withErrorCapture(fn: (lines: string[]) => Promise<void>): () => Promise<void> {
  return async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      lines.push(args.join(" "));
    });
    try {
      await fn(lines);
    } finally {
      spy.mockRestore();
    }
  };
}

describe("printHelp functions", () => {
  const originalExit = process.exit;

  beforeEach(() => {
    process.exit = vi.fn() as unknown as typeof process.exit;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it("printTypegenHelp shows help and exits", async () => {
    const { printTypegenHelp } = await import("../src/commands/typegen.js");
    printTypegenHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printGenerateHelp shows help and exits", async () => {
    const { printGenerateHelp } = await import("../src/commands/generate.js");
    printGenerateHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printLintHelp shows help and exits", async () => {
    const { printLintHelp } = await import("../src/commands/lint.js");
    printLintHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printMigrateHelp shows help and exits", async () => {
    const { printMigrateHelp } = await import("../src/commands/migrate.js");
    printMigrateHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printDoctorHelp shows help and exits", async () => {
    const { printDoctorHelp } = await import("../src/commands/doctor.js");
    printDoctorHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printBuildHelp shows help and exits", async () => {
    const { printBuildHelp } = await import("../src/commands/build.js");
    printBuildHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printDevHelp shows help and exits", async () => {
    const { printDevHelp } = await import("../src/commands/dev.js");
    printDevHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printStartHelp shows help and exits", async () => {
    const { printStartHelp } = await import("../src/commands/start.js");
    printStartHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printCollectionCreateHelp shows help and exits", async () => {
    const { printCollectionCreateHelp } = await import("../src/commands/collection.js");
    printCollectionCreateHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("printPluginCreateHelp shows help and exits", async () => {
    const { printPluginCreateHelp } = await import("../src/commands/plugin.js");
    printPluginCreateHelp();
    expect(process.exit).toHaveBeenCalledWith(0);
  });
});

describe("doctor command", () => {
  let tmpDir: string;
  const originalExit = process.exit;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-doctor-test-"));
    process.exit = vi.fn() as unknown as typeof process.exit;
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
    process.exit = originalExit;
  });

  it(
    "reports errors for empty project",
    withLogCapture(async (lines) => {
      const { doctor } = await import("../src/commands/doctor.js");
      await doctor({ dir: tmpDir });
      expect(lines.some((l) => l.includes("critical issue"))).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(1);
    }),
  );

  it(
    "passes when project structure is complete",
    withLogCapture(async (lines) => {
      writeFileSync(join(tmpDir, "package.json"), "{}");
      mkdirSync(join(tmpDir, "cms/collections"), { recursive: true });
      mkdirSync(join(tmpDir, "cms/globals"), { recursive: true });
      writeFileSync(join(tmpDir, "cms/config.json"), "{}");
      mkdirSync(join(tmpDir, "data"), { recursive: true });
      writeFileSync(join(tmpDir, "tsconfig.json"), "{}");
      writeFileSync(join(tmpDir, ".env"), "");

      const { doctor } = await import("../src/commands/doctor.js");
      await doctor({ dir: tmpDir });
      expect(lines.some((l) => l.includes("looks healthy"))).toBe(true);
    }),
  );

  it(
    "doctor with custom dir resolves correctly",
    withLogCapture(async (lines) => {
      const { doctor } = await import("../src/commands/doctor.js");
      await doctor({ dir: tmpDir });
      expect(lines.some((l) => l.includes(tmpDir))).toBe(true);
    }),
  );
});

describe("migrate command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-migrate-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
  });

  it(
    "logs no collections found when directory is empty",
    withLogCapture(async (lines) => {
      const { migrate } = await import("../src/commands/migrate.js");
      await migrate({ dir: tmpDir });
      expect(lines.some((l) => l.includes("No collections found"))).toBe(true);
    }),
  );

  it(
    "lists tables when collections exist",
    withLogCapture(async (lines) => {
      mkdirSync(join(tmpDir, "collections"), { recursive: true });
      writeFileSync(
        join(tmpDir, "collections", "posts.ts"),
        `import { defineCollection, text } from "@arche-cms/schema";\nexport default defineCollection({ slug: "posts", fields: [text("title")] })`,
      );
      const { migrate } = await import("../src/commands/migrate.js");
      await migrate({ dir: tmpDir });
      expect(lines.some((l) => l.includes("Found 1 collection(s)"))).toBe(true);
      expect(lines.some((l) => l.includes("posts"))).toBe(true);
      expect(lines.some((l) => l.includes("Migration complete"))).toBe(true);
    }),
  );
});

describe("typegen command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-typegen-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
  });

  it(
    "generates types from empty directory",
    withLogCapture(async (lines) => {
      const { typegen } = await import("../src/commands/typegen.js");
      await typegen({ dir: tmpDir, out: join(tmpDir, "types.ts") });
      expect(lines.some((l) => l.includes("Loading schemas"))).toBe(true);
    }),
  );

  it(
    "generates types with schema files present",
    withLogCapture(async (_lines) => {
      mkdirSync(join(tmpDir, "collections"), { recursive: true });
      writeFileSync(
        join(tmpDir, "collections", "posts.ts"),
        `export default defineCollection({ slug: "posts", fields: [text("title")] })`,
      );
      const outFile = join(tmpDir, "types.ts");
      const { typegen } = await import("../src/commands/typegen.js");
      await typegen({ dir: tmpDir, out: outFile });
      expect(existsSync(outFile)).toBe(true);
    }),
  );
});

describe("generate command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-generate-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
  });

  it(
    "runs generation from empty directory",
    withLogCapture(async (lines) => {
      const { generate } = await import("../src/commands/generate.js");
      await generate({ dir: tmpDir, out: join(tmpDir, "gen") });
      expect(lines.some((l) => l.includes("Found"))).toBe(true);
    }),
  );

  it(
    "generates types when schemas exist",
    withLogCapture(async (lines) => {
      mkdirSync(join(tmpDir, "collections"), { recursive: true });
      writeFileSync(
        join(tmpDir, "collections", "posts.ts"),
        `import { defineCollection, text } from "@arche-cms/schema";\nexport default defineCollection({ slug: "posts", fields: [text("title")] })`,
      );
      const { generate } = await import("../src/commands/generate.js");
      await generate({ dir: tmpDir, out: join(tmpDir, "gen") });
      expect(lines.some((l) => l.includes("Running generators"))).toBe(true);
      expect(existsSync(join(tmpDir, "gen", "types.ts"))).toBe(true);
      expect(existsSync(join(tmpDir, "gen", "sdk", "index.ts"))).toBe(true);
      expect(existsSync(join(tmpDir, "gen", "validation", "index.ts"))).toBe(true);
    }),
  );
});

describe("collection command", () => {
  let tmpDir: string;
  const originalExit = process.exit;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-collection-test-"));
    process.exit = vi.fn() as unknown as typeof process.exit;
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
    process.exit = originalExit;
  });

  it(
    "creates a collection file",
    withLogCapture(async (lines) => {
      const { collectionCreate } = await import("../src/commands/collection.js");
      await collectionCreate({ dir: tmpDir, slug: "articles" });
      expect(existsSync(join(tmpDir, "articles.ts"))).toBe(true);
      expect(lines.some((l) => l.includes("Created collection"))).toBe(true);
    }),
  );

  it(
    "rejects invalid slug",
    withErrorCapture(async (lines) => {
      const { collectionCreate } = await import("../src/commands/collection.js");
      await collectionCreate({ dir: tmpDir, slug: "123invalid" });
      expect(lines.some((l) => l.includes("Error: slug must start"))).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(1);
    }),
  );

  it(
    "rejects empty slug",
    withErrorCapture(async (lines) => {
      const { collectionCreate } = await import("../src/commands/collection.js");
      await collectionCreate({ dir: tmpDir, slug: "  " });
      expect(lines.some((l) => l.includes("Error: slug is required"))).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(1);
    }),
  );
});

describe("plugin command", () => {
  let tmpDir: string;
  const originalExit = process.exit;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-plugin-test-"));
    process.exit = vi.fn() as unknown as typeof process.exit;
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
    process.exit = originalExit;
  });

  it(
    "creates a plugin directory structure",
    withLogCapture(async (lines) => {
      const { pluginCreate } = await import("../src/commands/plugin.js");
      await pluginCreate({ dir: tmpDir, slug: "seo" });
      expect(existsSync(join(tmpDir, "seo"))).toBe(true);
      expect(lines.some((l) => l.includes("Created plugin"))).toBe(true);
    }),
  );

  it(
    "rejects invalid slug",
    withErrorCapture(async (lines) => {
      const { pluginCreate } = await import("../src/commands/plugin.js");
      await pluginCreate({ dir: tmpDir, slug: "123start" });
      expect(lines.some((l) => l.includes("Error: slug must start"))).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(1);
    }),
  );

  it(
    "rejects empty slug",
    withErrorCapture(async (lines) => {
      const { pluginCreate } = await import("../src/commands/plugin.js");
      await pluginCreate({ dir: tmpDir, slug: "" });
      expect(lines.some((l) => l.includes("Error: slug is required"))).toBe(true);
      expect(process.exit).toHaveBeenCalledWith(1);
    }),
  );
});
