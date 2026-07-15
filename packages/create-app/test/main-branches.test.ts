import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

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
  rmSync(tmpDir, { recursive: true, force: true });
  vi.doUnmock("node:readline");
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockReadline(responses: string[]) {
  let callIndex = 0;
  vi.doMock("node:readline", () => ({
    createInterface: () => ({
      question: (_query: string, cb: (answer: string) => void) => {
        cb(responses[callIndex++] ?? "");
      },
      close: () => {},
    }),
  }));
}

describe("main — line 15: empty answer uses default value", () => {
  it("uses default when readline returns empty string for dbAdapter", async () => {
    const projectName = "default-test";
    const projectDir = resolve(tmpDir, projectName);

    process.argv = ["node", "test", projectName];
    process.cwd = () => tmpDir;

    mockReadline(["", "en"]);
    await import("../src/index.js").catch(() => {});

    expect(existsSync(projectDir)).toBe(true);
  });

  it("uses default when readline returns empty string for all prompts", async () => {
    const projectName = "all-defaults";
    const projectDir = resolve(tmpDir, projectName);

    process.argv = ["node", "test", projectName];
    process.cwd = () => tmpDir;

    mockReadline(["", ""]);
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

    mockReadline(["sqlite", "en"]);
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
        question: (_query: string, cb: (answer: string) => void) => {
          cb("");
        },
        close: () => {},
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
        question: (_query: string, cb: (answer: string) => void) => {
          cb("  my-value  ");
        },
        close: () => {},
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
        question: (_query: string, cb: (answer: string) => void) => {
          cb("  explicit  ");
        },
        close: () => {},
      }),
    }));

    const { ask } = await import("../src/index.js");
    const result = await ask("Name", "fallback");
    expect(result).toBe("explicit");
  });
});
