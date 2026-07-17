import { describe, it, expect } from "vitest";

import { LocalStorageAdapter, S3Adapter, R2Adapter } from "../src/index.js";

describe("package index exports", () => {
  it("exports LocalStorageAdapter", () => {
    expect(LocalStorageAdapter).toBeDefined();
    expect(typeof LocalStorageAdapter).toBe("function");
  });

  it("exports S3Adapter", () => {
    expect(S3Adapter).toBeDefined();
    expect(typeof S3Adapter).toBe("function");
  });

  it("exports R2Adapter", () => {
    expect(R2Adapter).toBeDefined();
    expect(typeof R2Adapter).toBe("function");
  });
});
