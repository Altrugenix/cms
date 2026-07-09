# @altrugenix/core

Foundation package for the Altrugenix CMS framework. Provides dependency injection, event bus, lifecycle management, logging, and configuration loading.

## Installation

```bash
yarn add @altrugenix/core
```

## Exports

### Container

Typed, async-capable dependency injection container.

```ts
import { Container } from "@altrugenix/core";

const container = new Container();
container.register("db", async () => new SQLiteAdapter("file:./db.sqlite"));
const db = await container.resolve("db");
```

### EventBus

Typed event bus with async middleware support.

```ts
import { EventBus } from "@altrugenix/core";

const bus = new EventBus();
bus.on("user:created", async (payload) => {
  console.log("User created:", payload.email);
});
bus.emit("user:created", { email: "user@example.com" });
```

### Lifecycle

Manages application lifecycle states (init, ready, shutdown).

```ts
import { Lifecycle } from "@altrugenix/core";

const lifecycle = new Lifecycle();
lifecycle.onShutdown(async () => {
  await db.disconnect();
});
```

### createLogger

Creates a structured logger instance.

```ts
import { createLogger } from "@altrugenix/core";

const logger = createLogger({ level: "info" });
logger.info("Server started", { port: 3000 });
```

### createConfigLoader

Loads configuration from environment variables, files, and defaults.

```ts
import { createConfigLoader } from "@altrugenix/core";

const loader = createConfigLoader({ prefix: "CMS_" });
const config = loader.load();
```
