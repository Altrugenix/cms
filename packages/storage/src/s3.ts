import { Readable } from "node:stream";
import type { StorageAdapter } from "./types.js";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

export interface S3AdapterOptions {
  bucket: string;
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  baseDir?: string;
  forcePathStyle?: boolean;
}

export class S3Adapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private baseDir: string;

  constructor(options: S3AdapterOptions) {
    this.bucket = options.bucket;
    this.baseDir = options.baseDir ?? "";

    const clientConfig: S3ClientConfig = {
      region: options.region ?? "us-east-1",
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle ?? !!options.endpoint,
    };

    if (options.credentials) {
      clientConfig.credentials = options.credentials;
    }

    this.client = new S3Client(clientConfig);
  }

  private fullPath(path: string): string {
    return this.baseDir ? `${this.baseDir}/${path}` : path;
  }

  async save(path: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.fullPath(path),
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  }

  async delete(path: string): Promise<boolean> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: this.fullPath(path),
      }),
    );
    return true;
  }

  async getStream(path: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.fullPath(path),
      }),
    );

    const body = result.Body;
    if (!body) throw new Error(`Could not get stream for path: ${path}`);

    if (body instanceof Readable) return body;
    if (
      typeof (body as { transformToWebStream?: () => ReadableStream }).transformToWebStream ===
      "function"
    ) {
      return Readable.from(
        (body as { transformToWebStream: () => ReadableStream }).transformToWebStream(),
      );
    }

    return Readable.from(body as unknown as Iterable<unknown>);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.fullPath(path),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
