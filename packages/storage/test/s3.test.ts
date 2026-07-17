import { Readable } from "node:stream";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  const S3Client = vi.fn(() => ({ send: mockSend }));
  return {
    DeleteObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    mockSend,
    PutObjectCommand: vi.fn(),
    S3Client,
  };
});

const { DeleteObjectCommand, HeadObjectCommand, mockSend, PutObjectCommand, S3Client } =
  await import("@aws-sdk/client-s3");
const { S3Adapter } = await import("../src/s3.js");

describe("S3Adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs with bucket and region", () => {
    const adapter = new S3Adapter({ bucket: "test-bucket", region: "us-east-1" });
    expect(adapter).toBeInstanceOf(S3Adapter);
    expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({ region: "us-east-1" }));
  });

  it("constructs with credentials and endpoint", () => {
    new S3Adapter({
      bucket: "test-bucket",
      credentials: { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" },
      endpoint: "http://localhost:9000",
      forcePathStyle: true,
      region: "eu-west-1",
    });
    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" },
        endpoint: "http://localhost:9000",
        forcePathStyle: true,
      }),
    );
  });

  it("constructs with baseDir", () => {
    const adapter = new S3Adapter({ baseDir: "uploads", bucket: "test" });
    expect(adapter).toBeInstanceOf(S3Adapter);
  });

  it("forces path style when endpoint is set", () => {
    new S3Adapter({ bucket: "test", endpoint: "http://localhost:9000" });
    expect(S3Client).toHaveBeenCalledWith(expect.objectContaining({ forcePathStyle: true }));
  });

  it("save sends PutObjectCommand", async () => {
    const adapter = new S3Adapter({ bucket: "test" });
    mockSend.mockResolvedValue({});
    await adapter.save("file.txt", Buffer.from("hello"), "text/plain");
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Body: Buffer.from("hello"),
      Bucket: "test",
      ContentType: "text/plain",
      Key: "file.txt",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("save with baseDir prepends path", async () => {
    const adapter = new S3Adapter({ baseDir: "uploads", bucket: "test" });
    mockSend.mockResolvedValue({});
    await adapter.save("file.txt", Buffer.from("data"), "image/png");
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "uploads/file.txt" }),
    );
  });

  it("delete sends DeleteObjectCommand", async () => {
    const adapter = new S3Adapter({ bucket: "test" });
    mockSend.mockResolvedValue({});
    const result = await adapter.delete("file.txt");
    expect(result).toBe(true);
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "test",
      Key: "file.txt",
    });
  });

  it("getStream returns Readable from Body", async () => {
    const adapter = new S3Adapter({ bucket: "test" });
    const stream = new Readable({
      read() {
        this.push("data");
        this.push(null);
      },
    });
    mockSend.mockResolvedValue({ Body: stream });
    const result = await adapter.getStream("file.txt");
    expect(result).toBeInstanceOf(Readable);
    const chunks: Buffer[] = [];
    for await (const chunk of result) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString()).toBe("data");
  });

  it("getStream throws when Body is null", async () => {
    const adapter = new S3Adapter({ bucket: "test" });
    mockSend.mockResolvedValue({ Body: undefined });
    await expect(adapter.getStream("file.txt")).rejects.toThrow("Could not get stream");
  });

  it("exists returns true when HeadObjectCommand succeeds", async () => {
    const adapter = new S3Adapter({ bucket: "test" });
    mockSend.mockResolvedValue({});
    const result = await adapter.exists("file.txt");
    expect(result).toBe(true);
    expect(HeadObjectCommand).toHaveBeenCalledWith({
      Bucket: "test",
      Key: "file.txt",
    });
  });

  it("exists returns false when HeadObjectCommand throws", async () => {
    const adapter = new S3Adapter({ bucket: "test" });
    mockSend.mockRejectedValue(new Error("Not found"));
    const result = await adapter.exists("file.txt");
    expect(result).toBe(false);
  });
});
