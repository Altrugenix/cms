import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

describe("build command", () => {
  let tmpDir: string;
  const originalExit = process.exit;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-build-test-"));
    process.exit = vi.fn() as unknown as typeof process.exit;
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    process.exit = originalExit;
  });

  describe("printBuildHelp", () => {
    it("shows help and exits 0", async () => {
      const { printBuildHelp } = await import("../src/commands/build.js");
      printBuildHelp();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe("generateDockerfile (via build with outDir)", () => {
    it(
      "creates Dockerfile and .dockerignore when outDir is set",
      withLogCapture(async (lines) => {
        vi.doMock("node:child_process", () => ({
          execSync: vi.fn(),
        }));
        vi.doMock("node:fs", async () => {
          const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
          return {
            ...actual,
            existsSync: vi.fn().mockReturnValue(true),
          };
        });

        const { build } = await import("../src/commands/build.js");
        await build({ outDir: tmpDir });

        expect(existsSync(join(tmpDir, "Dockerfile"))).toBe(true);
        expect(existsSync(join(tmpDir, ".dockerignore"))).toBe(true);
        expect(lines.some((l) => l.includes("Generated Dockerfile"))).toBe(true);
        expect(lines.some((l) => l.includes("Generated package.json"))).toBe(true);

        vi.doUnmock("node:child_process");
        vi.doUnmock("node:fs");
      }),
    );
  });

  describe("generatePackageJson (via build with outDir)", () => {
    it(
      "creates package.json with correct structure",
      withLogCapture(async (_lines) => {
        vi.doMock("node:child_process", () => ({
          execSync: vi.fn(),
        }));
        vi.doMock("node:fs", async () => {
          const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
          return {
            ...actual,
            existsSync: vi.fn().mockReturnValue(true),
          };
        });

        const { build } = await import("../src/commands/build.js");
        await build({ outDir: tmpDir });

        const pkgPath = join(tmpDir, "package.json");
        expect(existsSync(pkgPath)).toBe(true);
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        expect(pkg.name).toBe("arche-cms-production");
        expect(pkg.private).toBe(true);
        expect(pkg.type).toBe("module");
        expect(pkg.scripts.start).toContain("start");
        expect(pkg.dependencies.fastify).toBeDefined();
        expect(pkg.dependencies["drizzle-orm"]).toBeDefined();

        vi.doUnmock("node:child_process");
        vi.doUnmock("node:fs");
      }),
    );
  });

  describe("build — without outDir", () => {
    it(
      "completes without error when outDir is not provided",
      withLogCapture(async (lines) => {
        vi.doMock("node:child_process", () => ({
          execSync: vi.fn(),
        }));
        vi.doMock("node:fs", async () => {
          const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
          return {
            ...actual,
            existsSync: vi.fn().mockReturnValue(true),
          };
        });

        const { build } = await import("../src/commands/build.js");
        await build({ clean: false });

        expect(lines.some((l) => l.includes("Building CMS for production"))).toBe(true);
        expect(lines.some((l) => l.includes("Build complete"))).toBe(true);
        expect(lines.some((l) => l.includes("Assembling production bundle"))).toBe(false);

        vi.doUnmock("node:child_process");
        vi.doUnmock("node:fs");
      }),
    );
  });

  describe("build — with clean", () => {
    it(
      "calls clean before building",
      withLogCapture(async (lines) => {
        const execSyncMock = vi.fn();
        vi.doMock("node:child_process", () => ({
          execSync: execSyncMock,
        }));
        vi.doMock("node:fs", async () => {
          const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
          return {
            ...actual,
            existsSync: vi.fn().mockReturnValue(true),
          };
        });

        const { build } = await import("../src/commands/build.js");
        await build({ clean: true });

        expect(execSyncMock).toHaveBeenCalledWith("pnpm clean", { stdio: "inherit" });
        expect(lines.some((l) => l.includes("Cleaning build artifacts"))).toBe(true);

        vi.doUnmock("node:child_process");
        vi.doUnmock("node:fs");
      }),
    );

    it(
      "skips clean when clean is false",
      withLogCapture(async () => {
        const execSyncMock = vi.fn();
        vi.doMock("node:child_process", () => ({
          execSync: execSyncMock,
        }));
        vi.doMock("node:fs", async () => {
          const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
          return {
            ...actual,
            existsSync: vi.fn().mockReturnValue(true),
          };
        });

        const { build } = await import("../src/commands/build.js");
        await build({ clean: false });

        expect(execSyncMock).not.toHaveBeenCalledWith("pnpm clean", expect.anything());

        vi.doUnmock("node:child_process");
        vi.doUnmock("node:fs");
      }),
    );
  });

  describe("build — exec failure", () => {
    it(
      "exits 1 when build fails",
      withLogCapture(async () => {
        vi.doMock("node:child_process", () => ({
          execSync: vi.fn().mockImplementation(() => {
            throw new Error("build error");
          }),
        }));
        vi.doMock("node:fs", async () => {
          const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
          return {
            ...actual,
            existsSync: vi.fn().mockReturnValue(true),
          };
        });

        const { build } = await import("../src/commands/build.js");
        await build({ clean: false });

        expect(process.exit).toHaveBeenCalledWith(1);

        vi.doUnmock("node:child_process");
        vi.doUnmock("node:fs");
      }),
    );
  });
});
