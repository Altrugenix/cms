import { describe, it, expect } from "vitest";
import { S3Adapter } from "../src/s3.js";

describe("S3Adapter", () => {
  it("constructs with bucket and region", () => {
    const adapter = new S3Adapter({
      bucket: "test-bucket",
      region: "us-east-1",
    });
    expect(adapter).toBeInstanceOf(S3Adapter);
  });

  it("constructs with credentials and endpoint", () => {
    const adapter = new S3Adapter({
      bucket: "test-bucket",
      region: "eu-west-1",
      endpoint: "http://localhost:9000",
      credentials: { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" },
      forcePathStyle: true,
    });
    expect(adapter).toBeInstanceOf(S3Adapter);
  });

  it("constructs with baseDir", () => {
    const adapter = new S3Adapter({ bucket: "test", baseDir: "uploads" });
    expect(adapter).toBeInstanceOf(S3Adapter);
  });

  it("exists returns false for non-existent keys", async () => {
    const adapter = new S3Adapter({ bucket: "test" });
    const result = await adapter.exists("nonexistent.txt");
    expect(result).toBe(false);
  });
});
