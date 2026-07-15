import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalStorageAdapter } from "../src/local.js";

describe("LocalStorageAdapter - path traversal", () => {
  let baseDir: string;
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    baseDir = mkdtempSync(join(tmpdir(), "storage-traversal-test-"));
    adapter = new LocalStorageAdapter(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("throws on path traversal in save", async () => {
    await expect(
      adapter.save("../../etc/passwd", Buffer.from("test"), "text/plain"),
    ).rejects.toThrow("Invalid file path");
  });

  it("throws on path traversal in delete", async () => {
    await expect(adapter.delete("../../etc/passwd")).rejects.toThrow("Invalid file path");
  });

  it("throws on path traversal in getStream", async () => {
    await expect(adapter.getStream("../../etc/passwd")).rejects.toThrow("Invalid file path");
  });

  it("throws on path traversal in exists", async () => {
    await expect(adapter.exists("../../etc/passwd")).rejects.toThrow("Invalid file path");
  });
});
