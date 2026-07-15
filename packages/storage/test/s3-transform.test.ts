import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "node:stream";

vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  const S3Client = vi.fn(() => ({ send: mockSend }));
  return {
    S3Client,
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    mockSend,
  };
});

const { mockSend } = await import("@aws-sdk/client-s3");
const { S3Adapter } = await import("../src/s3.js");

describe("S3Adapter getStream - transformToWebStream branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses transformToWebStream when available on body", async () => {
    const adapter = new S3Adapter({ bucket: "test" });
    const chunks = [new TextEncoder().encode("hello web stream")];
    const webStream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    mockSend.mockResolvedValue({
      Body: {
        transformToWebStream: () => webStream,
      },
    });

    const result = await adapter.getStream("file.txt");
    expect(result).toBeInstanceOf(Readable);

    const collected: Buffer[] = [];
    for await (const chunk of result) {
      collected.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(collected).toString()).toBe("hello web stream");
  });

  it("falls back to iterable when body is neither Readable nor transformToWebStream", async () => {
    const adapter = new S3Adapter({ bucket: "test" });

    const iterableBody = {
      [Symbol.iterator]: function* () {
        yield Buffer.from("iterable data");
      },
    };

    mockSend.mockResolvedValue({
      Body: iterableBody,
    });

    const result = await adapter.getStream("file.txt");
    expect(result).toBeInstanceOf(Readable);

    const collected: Buffer[] = [];
    for await (const chunk of result) {
      collected.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(collected).toString()).toBe("iterable data");
  });
});
