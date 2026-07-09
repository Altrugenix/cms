import { describe, it, expect } from "vitest";
import { R2Adapter } from "../src/r2.js";

describe("R2Adapter", () => {
  it("constructs with bucket and account ID", () => {
    const adapter = new R2Adapter({
      bucket: "test-bucket",
      accountId: "abc123",
      accessKeyId: "key",
      secretAccessKey: "secret",
    });
    expect(adapter).toBeInstanceOf(R2Adapter);
  });

  it("constructs with baseDir", () => {
    const adapter = new R2Adapter({
      bucket: "test",
      accountId: "abc123",
      accessKeyId: "key",
      secretAccessKey: "secret",
      baseDir: "uploads",
    });
    expect(adapter).toBeInstanceOf(R2Adapter);
  });
});
