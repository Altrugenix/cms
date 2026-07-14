# @arche-cms/core

Foundation package for the Arche CMS framework. Provides dependency injection, event bus, lifecycle management, logging, and configuration loading.

## Installation

```bash
yarn add @arche-cms/core
```

## Exports

### Container

Typed, async-capable dependency injection container.

```ts
import { Container } from "@arche-cms/core";

const container = new Container();
container.register("db", async () => new SQLiteAdapter("file:./db.sqlite"));
const db = await container.resolve("db");
```

### EventBus

Typed event bus with async middleware support.

```ts
import { EventBus } from "@arche-cms/core";

const bus = new EventBus();
bus.on("user:created", async (payload) => {
  console.log("User created:", payload.email);
});
bus.emit("user:created", { email: "user@example.com" });
```

### Lifecycle

Manages application lifecycle states (init, ready, shutdown).

```ts
import { Lifecycle } from "@arche-cms/core";

const lifecycle = new Lifecycle();
lifecycle.onShutdown(async () => {
  await db.disconnect();
});
```

### createLogger

Creates a structured logger instance.

```ts
import { createLogger } from "@arche-cms/core";

const logger = createLogger({ level: "info" });
logger.info("Server started", { port: 3000 });
```

### createConfigLoader

Loads configuration from environment variables, files, and defaults.

```ts
import { createConfigLoader } from "@arche-cms/core";

const loader = createConfigLoader({ prefix: "CMS_" });
const config = loader.load();
```
