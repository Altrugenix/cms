import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let tmpDir: string;
let originalArgv: string[];
let originalCwd: typeof process.cwd;

beforeEach(() => {
  tmpDir = mkdtempSync(resolve(tmpdir(), "arche-cms-branch-test-"));
  originalArgv = process.argv;
  originalCwd = process.cwd;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.argv = originalArgv;
  process.cwd = originalCwd;
  rmSync(tmpDir, { force: true, recursive: true });
  vi.doUnmock("node:readline");
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

describe("main — line 15: empty answer uses default value", () => {
  it("uses default when readline returns empty string for dbAdapter", async () => {
    const projectName = "default-test";
    const projectDir = resolve(tmpDir, projectName);

    process.argv = ["node", "test", projectName];
    process.cwd = () => tmpDir;

    mockReadline(["", "", "en"]);
    await import("../src/index.js").catch(() => {});

    expect(existsSync(projectDir)).toBe(true);
  });

  it("uses default when readline returns empty string for all prompts", async () => {
    const projectName = "all-defaults";
    const projectDir = resolve(tmpDir, projectName);

    process.argv = ["node", "test", projectName];
    process.cwd = () => tmpDir;

    mockReadline(["", "", ""]);
    await import("../src/index.js").catch(() => {});

    expect(existsSync(projectDir)).toBe(true);
  });
});

describe("main — line 37: projectDir split pop fallback", () => {
  it("scaffolds project with valid name", async () => {
    const projectName = "valid-name";
    const projectDir = resolve(tmpDir, projectName);

    process.argv = ["node", "test", projectName];
    process.cwd = () => tmpDir;

    mockReadline(["rest", "sqlite", "en"]);
    await import("../src/index.js").catch(() => {});

    expect(existsSync(projectDir)).toBe(true);
  });
});

describe("ask() — undefined defaultVal branches", () => {
  it('returns empty string when answer is empty and defaultVal is undefined (line 12 falsy, line 15 fallback to "")', async () => {
    vi.resetModules();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.doMock("node:readline", () => ({
      createInterface: () => ({
        close: () => {},
        question: (_query: string, cb: (answer: string) => void) => {
          cb("");
        },
      }),
    }));

    const { ask } = await import("../src/index.js");
    const result = await ask("Name");
    expect(result).toBe("");
  });

  it("returns trimmed answer when defaultVal is undefined", async () => {
    vi.resetModules();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.doMock("node:readline", () => ({
      createInterface: () => ({
        close: () => {},
        question: (_query: string, cb: (answer: string) => void) => {
          cb("  my-value  ");
        },
      }),
    }));

    const { ask } = await import("../src/index.js");
    const result = await ask("Name");
    expect(result).toBe("my-value");
  });

  it("returns trimmed answer over default when both provided", async () => {
    vi.resetModules();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.doMock("node:readline", () => ({
      createInterface: () => ({
        close: () => {},
        question: (_query: string, cb: (answer: string) => void) => {
          cb("  explicit  ");
        },
      }),
    }));

    const { ask } = await import("../src/index.js");
    const result = await ask("Name", "fallback");
    expect(result).toBe("explicit");
  });
});

describe("main — line 215: catch handler", () => {
  it("logs Error instances with err.message", async () => {
    vi.resetModules();
    process.argv = ["node", "test", "error-test"];
    process.cwd = () => tmpDir;

    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.doMock("node:fs", () => ({
      existsSync: () => {
        throw new Error("disk full");
      },
      mkdirSync: () => {},
      writeFileSync: () => {},
    }));

    await import("../src/index.js").catch(() => {});

    expect(console.error).toHaveBeenCalledWith("Error:", "disk full");
  });

  it("logs non-Error values with String(err)", async () => {
    vi.resetModules();
    process.argv = ["node", "test", "error-test-2"];
    process.cwd = () => tmpDir;

    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.doMock("node:fs", () => ({
      existsSync: () => {
        throw "something went wrong";
      },
      mkdirSync: () => {},
      writeFileSync: () => {},
    }));

    await import("../src/index.js").catch(() => {});

    expect(console.error).toHaveBeenCalledWith("Error:", "something went wrong");
  });
});
