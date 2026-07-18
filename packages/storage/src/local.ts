import type { Readable } from "node:stream";

import { createReadStream } from "node:fs";
import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";

import type { StorageAdapter } from "./types.js";

function safePath(baseDir: string, filePath: string): string {
  const fullPath = resolve(join(baseDir, filePath));
  const resolvedBase = resolve(baseDir);
  if (!fullPath.startsWith(resolvedBase)) {
    throw new Error("Invalid file path");
  }
  return fullPath;
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = resolve(baseDir);
  }

  async save(filePath: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const fullPath = safePath(this.baseDir, filePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = safePath(this.baseDir, filePath);
    try {
      await unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getStream(filePath: string): Promise<Readable> {
    const fullPath = safePath(this.baseDir, filePath);
    return createReadStream(fullPath);
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = safePath(this.baseDir, filePath);
    try {
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
