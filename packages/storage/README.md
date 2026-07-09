# @altrugenix/storage

File storage adapters for Altrugenix CMS. Supports local filesystem, S3-compatible, and Cloudflare R2 storage backends.

## Installation

```bash
yarn add @altrugenix/storage
```

## Usage

### Local Storage

```ts
import { LocalStorageAdapter } from "@altrugenix/storage";

const storage = new LocalStorageAdapter("./uploads");

await storage.save("images/logo.png", buffer, "image/png");
const stream = await storage.getStream("images/logo.png");
await storage.delete("images/logo.png");
const exists = await storage.exists("images/logo.png");
```

### S3-Compatible Storage

```ts
import { S3Adapter } from "@altrugenix/storage";

const storage = new S3Adapter({
  bucket: "my-bucket",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Same interface: save, delete, getStream, exists
await storage.save("file.pdf", buffer, "application/pdf");
```

### Cloudflare R2

```ts
import { R2Adapter } from "@altrugenix/storage";

const storage = new R2Adapter({
  bucket: "my-bucket",
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
});
```

## StorageAdapter Interface

```ts
interface StorageAdapter {
  save(path: string, buffer: Buffer, mimeType: string): Promise<void>;
  delete(path: string): Promise<boolean>;
  getStream(path: string): Promise<Readable>;
  exists(path: string): Promise<boolean>;
}
```
