import { mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let tmpDir: string;
let originalArgv: string[];
let originalCwd: typeof process.cwd;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockErr: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tmpDir = mkdtempSync(resolve(tmpdir(), "arche-cms-main-test-"));
  originalArgv = process.argv;
  originalCwd = process.cwd;
  mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
  mockErr = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.argv = originalArgv;
  process.cwd = originalCwd;
  rmSync(tmpDir, { force: true, recursive: true });
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockReadline(responses: string[]) {
  let callIndex = 0;
  vi.doMock("node:readline", () => ({
    createInterface: () => ({
      close: () => {},
      question: (_query: string, cb: (answer: string) => void) => {
        cb(responses[callIndex++] ?? "");
      },
    }),
  }));
}

function mockProcessExit() {
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
}

describe("main - --help flag", () => {
  it("prints usage and calls process.exit(0) when --help is passed", async () => {
    process.argv = ["node", "test", "--help"];
    process.cwd = () => tmpDir;
    mockProcessExit();
    mockReadline([]);

    await import("../src/index.js").catch(() => {});

    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Usage: npm create @arche-cms/create-app"),
    );
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("prints usage and calls process.exit(0) when -h is passed", async () => {
    process.argv = ["node", "test", "-h"];
    process.cwd = () => tmpDir;
    mockProcessExit();
    mockReadline([]);

    await import("../src/index.js").catch(() => {});

    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Creates a new Arche CMS project"),
    );
    expect(process.exit).toHaveBeenCalledWith(0);
  });
});

describe("main - directory already exists", () => {
  it("prints error and calls process.exit(1) when directory exists", async () => {
    const projectName = "existing-project";
    mkdirSync(resolve(tmpDir, projectName));

    process.argv = ["node", "test", projectName];
    process.cwd = () => tmpDir;
    mockProcessExit();
    mockReadline([]);

    await import("../src/index.js").catch(() => {});

    expect(mockErr).toHaveBeenCalledWith(expect.stringContaining("Directory already exists"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe("main - normal flow with project name arg", () => {
  it("creates project using provided name and prompted options", async () => {
    const projectName = "my-new-cms";
    const projectDir = resolve(tmpDir, projectName);

    process.argv = ["node", "test", projectName];
    process.cwd = () => tmpDir;

    mockReadline(["rest", "postgres", "fr"]);
    await import("../src/index.js").catch(() => {});

    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Creating CMS project: my-new-cms"),
    );
    expect(existsSync(projectDir)).toBe(true);
  });
});

describe("main - normal flow without project name arg", () => {
  it("prompts for project name and creates project", async () => {
    const projectName = "prompted-cms";
    const projectDir = resolve(tmpDir, projectName);

    process.argv = ["node", "test"];
    process.cwd = () => tmpDir;

    mockReadline([projectName, "rest", "sqlite", "en"]);
    await import("../src/index.js").catch(() => {});
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Creating CMS project: prompted-cms"),
    );
    expect(existsSync(projectDir)).toBe(true);
  });
});

describe("main - error handling", () => {
  it("catches errors and calls process.exit(1)", async () => {
    process.argv = ["node", "test", "error-project"];
    process.cwd = () => tmpDir;
    mockProcessExit();

    vi.doMock("node:readline", () => ({
      createInterface: () => ({
        close: () => {},
        question: (_query: string, _cb: (answer: string) => void) => {
          throw new Error("readline failure");
        },
      }),
    }));

    await import("../src/index.js").catch(() => {});

    expect(mockErr).toHaveBeenCalledWith("Error:", expect.stringContaining("readline failure"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("rejects invalid database adapter and calls process.exit(1)", async () => {
    process.argv = ["node", "test", "bad-adapter-project"];
    process.cwd = () => tmpDir;
    mockProcessExit();
    mockReadline(["rest", "mysql", "en"]);

    await import("../src/index.js").catch(() => {});

    expect(mockErr).toHaveBeenCalledWith(expect.stringContaining("Invalid database adapter"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
