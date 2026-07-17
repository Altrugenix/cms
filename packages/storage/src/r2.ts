import { S3Adapter, type S3AdapterOptions } from "./s3.js";

export interface R2AdapterOptions {
  bucket: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  baseDir?: string;
}

export class R2Adapter extends S3Adapter {
  constructor(options: R2AdapterOptions) {
    const s3Options: S3AdapterOptions = {
      baseDir: options.baseDir,
      bucket: options.bucket,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      region: "auto",
    };
    super(s3Options);
  }
}
