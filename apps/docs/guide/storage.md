# Storage

Arche CMS supports multiple storage backends for file uploads through a common `StorageAdapter` interface.

## Adapters

| Adapter | Package              | Description                  |
| ------- | -------------------- | ---------------------------- |
| Local   | `@arche-cms/storage` | Filesystem storage (default) |
| S3      | `@arche-cms/storage` | AWS S3-compatible storage    |
| R2      | `@arche-cms/storage` | Cloudflare R2 storage        |

## Configuration

### Local Storage (Default)

```ts
import { LocalStorageAdapter } from "@arche-cms/storage";

const storage = new LocalStorageAdapter({
  basePath: "./media",
  baseUrl: "/media",
});
```

### S3 Storage

```ts
import { S3Adapter } from "@arche-cms/storage";

const storage = new S3Adapter({
  region: "us-east-1",
  bucket: "my-cms-bucket",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  baseUrl: "https://my-cms-bucket.s3.amazonaws.com",
});
```

### Cloudflare R2 Storage

```ts
import { R2Adapter } from "@arche-cms/storage";

const storage = new R2Adapter({
  endpoint: process.env.R2_ENDPOINT!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucket: "my-cms-bucket",
  baseUrl: "https://pub-xxxx.r2.dev",
});
```

## StorageAdapter Interface

```ts
interface StorageAdapter {
  save(path: string, buffer: Buffer): Promise<void>;
  delete(path: string): Promise<boolean>;
  getStream(path: string): Promise<Readable>;
  exists(path: string): Promise<boolean>;
}
```
