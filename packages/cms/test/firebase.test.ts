import { writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";

import {
  firebaseSetup,
  firebaseDeployRules,
  firebaseDeployIndexes,
  printFirebaseHelp,
} from "../src/commands/firebase.js";

function tmpDir(): string {
  return `/tmp/firebase-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("firebaseSetup", () => {
  it("creates .env.local when it does not exist", async () => {
    const dir = tmpDir();
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));

    await firebaseSetup({ dir });

    expect(writeFile).toHaveBeenCalledWith(
      resolve(dir, ".env.local"),
      expect.stringContaining("VITE_FIREBASE_API_KEY="),
      "utf-8",
    );
    expect(writeFile).toHaveBeenCalledWith(
      resolve(dir, "firebase.json"),
      expect.stringContaining("emulators"),
      "utf-8",
    );
  });

  it("skips .env.local when it already exists", async () => {
    const dir = tmpDir();
    (access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));

    await firebaseSetup({ dir });

    expect(writeFile).not.toHaveBeenCalledWith(
      resolve(dir, ".env.local"),
      expect.anything(),
      expect.anything(),
    );
  });

  it("skips firebase.json when it already exists", async () => {
    const dir = tmpDir();
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));

    await firebaseSetup({ dir });

    expect(writeFile).not.toHaveBeenCalledWith(
      resolve(dir, "firebase.json"),
      expect.anything(),
      expect.anything(),
    );
  });

  it("copies firestore.rules when available", async () => {
    const dir = tmpDir();
    const { readFile } = await import("node:fs/promises");
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce("rules content");

    await firebaseSetup({ dir });

    expect(writeFile).toHaveBeenCalledWith(
      resolve(dir, "firestore.rules"),
      "rules content",
      "utf-8",
    );
  });

  it("skips firestore.rules when not available", async () => {
    const dir = tmpDir();
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));

    await firebaseSetup({ dir });

    expect(writeFile).not.toHaveBeenCalledWith(
      resolve(dir, "firestore.rules"),
      expect.anything(),
      expect.anything(),
    );
  });

  it("copies storage.rules when available", async () => {
    const dir = tmpDir();
    const { readFile } = await import("node:fs/promises");
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce("storage rules");

    await firebaseSetup({ dir });

    expect(writeFile).toHaveBeenCalledWith(resolve(dir, "storage.rules"), "storage rules", "utf-8");
  });

  it("skips storage.rules when not available", async () => {
    const dir = tmpDir();
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));

    await firebaseSetup({ dir });

    expect(writeFile).not.toHaveBeenCalledWith(
      resolve(dir, "storage.rules"),
      expect.anything(),
      expect.anything(),
    );
  });

  it("copies firestore.indexes.json when available", async () => {
    const dir = tmpDir();
    const { readFile } = await import("node:fs/promises");
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce('{"indexes":[]}');

    await firebaseSetup({ dir });

    expect(writeFile).toHaveBeenCalledWith(
      resolve(dir, "firestore.indexes.json"),
      '{"indexes":[]}',
      "utf-8",
    );
  });

  it("skips firestore.indexes.json when not available", async () => {
    const dir = tmpDir();
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));
    (access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ENOENT"));

    await firebaseSetup({ dir });

    expect(writeFile).not.toHaveBeenCalledWith(
      resolve(dir, "firestore.indexes.json"),
      expect.anything(),
      expect.anything(),
    );
  });

  it("uses cwd when no dir specified", async () => {
    (access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ENOENT"));

    await firebaseSetup({});

    expect(writeFile).toHaveBeenCalled();
  });
});

describe("firebaseDeployRules", () => {
  it("calls execSync with correct command", async () => {
    const dir = tmpDir();
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    await firebaseDeployRules({ dir });

    expect(execSync).toHaveBeenCalledWith("firebase deploy --only firestore:rules,storage", {
      cwd: dir,
      stdio: "inherit",
    });
  });

  it("exits with code 1 on failure", async () => {
    const dir = tmpDir();
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("deploy failed");
    });

    await firebaseDeployRules({ dir });

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("uses cwd when no dir specified", async () => {
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    await firebaseDeployRules({});

    expect(execSync).toHaveBeenCalled();
  });
});

describe("firebaseDeployIndexes", () => {
  it("calls execSync with correct command", async () => {
    const dir = tmpDir();
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    await firebaseDeployIndexes({ dir });

    expect(execSync).toHaveBeenCalledWith("firebase deploy --only firestore:indexes", {
      cwd: dir,
      stdio: "inherit",
    });
  });

  it("exits with code 1 on failure", async () => {
    const dir = tmpDir();
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("deploy failed");
    });

    await firebaseDeployIndexes({ dir });

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("uses cwd when no dir specified", async () => {
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    await firebaseDeployIndexes({});

    expect(execSync).toHaveBeenCalled();
  });
});

describe("printFirebaseHelp", () => {
  it("prints help text", () => {
    printFirebaseHelp();
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("cms firebase"));
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("setup"));
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("deploy-rules"));
    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("deploy-indexes"));
  });
});
