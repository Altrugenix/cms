import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
});

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

describe("migrate command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-migrate-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it(
    "logs no collections found when directory is empty",
    withLogCapture(async (lines) => {
      const { migrate } = await import("../src/commands/migrate.js");
      await migrate({ dir: tmpDir });
      expect(lines.some((l) => l.includes("No collections found"))).toBe(true);
    }),
  );
});

describe("doctor command", () => {
  let tmpDir: string;
  const originalExit = process.exit;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-doctor-test-"));
    process.exit = vi.fn() as unknown as typeof process.exit;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
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
});

describe("typegen command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-typegen-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it(
    "generates types from empty directory",
    withLogCapture(async (lines) => {
      const { typegen } = await import("../src/commands/typegen.js");
      await typegen({ dir: tmpDir, out: join(tmpDir, "types.ts") });
      expect(lines.some((l) => l.includes("Loading schemas"))).toBe(true);
    }),
  );
});

describe("generate command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-generate-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it(
    "runs generation from empty directory",
    withLogCapture(async (lines) => {
      const { generate } = await import("../src/commands/generate.js");
      await generate({ dir: tmpDir, out: join(tmpDir, "gen") });
      expect(lines.some((l) => l.includes("Found"))).toBe(true);
    }),
  );
});
