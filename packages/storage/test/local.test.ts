import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { LocalStorageAdapter } from "../src/local.js";

describe("LocalStorageAdapter", () => {
  let baseDir: string;
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    baseDir = mkdtempSync(join(tmpdir(), "storage-test-"));
    adapter = new LocalStorageAdapter(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { force: true, recursive: true });
  });

  describe("save", () => {
    it("writes a file to disk", async () => {
      const buffer = Buffer.from("hello world");
      await adapter.save("test.txt", buffer, "text/plain");
      expect(existsSync(join(baseDir, "test.txt"))).toBe(true);
      expect(readFileSync(join(baseDir, "test.txt"), "utf-8")).toBe("hello world");
    });

    it("creates intermediate directories", async () => {
      const buffer = Buffer.from("nested");
      await adapter.save("a/b/c/file.txt", buffer, "text/plain");
      expect(existsSync(join(baseDir, "a/b/c/file.txt"))).toBe(true);
    });
  });

  describe("exists", () => {
    it("returns true for existing files", async () => {
      await adapter.save("exists.txt", Buffer.from("test"), "text/plain");
      expect(await adapter.exists("exists.txt")).toBe(true);
    });

    it("returns false for missing files", async () => {
      expect(await adapter.exists("missing.txt")).toBe(false);
    });
  });

  describe("delete", () => {
    it("removes a file", async () => {
      await adapter.save("delete.txt", Buffer.from("test"), "text/plain");
      expect(await adapter.delete("delete.txt")).toBe(true);
      expect(await adapter.exists("delete.txt")).toBe(false);
    });

    it("returns false for missing files", async () => {
      expect(await adapter.delete("missing.txt")).toBe(false);
    });
  });

  describe("getStream", () => {
    it("returns a readable stream", async () => {
      await adapter.save("stream.txt", Buffer.from("stream test"), "text/plain");
      const stream = await adapter.getStream("stream.txt");
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      expect(Buffer.concat(chunks).toString("utf-8")).toBe("stream test");
    });
  });
});
