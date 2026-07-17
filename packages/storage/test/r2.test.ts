import { describe, it, expect } from "vitest";

import { R2Adapter } from "../src/r2.js";

describe("R2Adapter", () => {
  it("constructs with bucket and account ID", () => {
    const adapter = new R2Adapter({
      accessKeyId: "key",
      accountId: "abc123",
      bucket: "test-bucket",
      secretAccessKey: "secret",
    });
    expect(adapter).toBeInstanceOf(R2Adapter);
  });

  it("constructs with baseDir", () => {
    const adapter = new R2Adapter({
      accessKeyId: "key",
      accountId: "abc123",
      baseDir: "uploads",
      bucket: "test",
      secretAccessKey: "secret",
    });
    expect(adapter).toBeInstanceOf(R2Adapter);
  });
});
