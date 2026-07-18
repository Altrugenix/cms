import { describe, it, expect } from "vitest";

import { Container, EventBus, Lifecycle, createLogger, createConfigLoader } from "../src/index.js";

describe("package index exports", () => {
  it("exports Container", () => {
    expect(Container).toBeDefined();
    expect(typeof Container).toBe("function");
  });

  it("exports EventBus", () => {
    expect(EventBus).toBeDefined();
    expect(typeof EventBus).toBe("function");
  });

  it("exports Lifecycle", () => {
    expect(Lifecycle).toBeDefined();
    expect(typeof Lifecycle).toBe("function");
  });

  it("exports createLogger", () => {
    expect(createLogger).toBeDefined();
    expect(typeof createLogger).toBe("function");
  });

  it("exports createConfigLoader", () => {
    expect(createConfigLoader).toBeDefined();
    expect(typeof createConfigLoader).toBe("function");
  });
});

describe("Container", () => {
  it("registers and resolves a singleton", async () => {
    const c = new Container();
    c.register("greeter", () => "hello");
    expect(await c.resolve<string>("greeter")).toBe("hello");
  });

  it("reuses singleton instance", async () => {
    const c = new Container();
    let count = 0;
    c.register("counter", () => ++count);
    await c.resolve("counter");
    await c.resolve("counter");
    expect(count).toBe(1);
  });

  it("creates new instances for non-singleton", async () => {
    const c = new Container();
    let count = 0;
    c.register("counter", () => ++count, false);
    await c.resolve("counter");
    await c.resolve("counter");
    expect(count).toBe(2);
  });

  it("supports child containers with inheritance", async () => {
    const parent = new Container();
    parent.register("db", () => "pg");
    const child = parent.createChild();
    child.register("cache", () => "redis");
    expect(await child.resolve<string>("db")).toBe("pg");
    expect(await child.resolve<string>("cache")).toBe("redis");
  });

  it("child can override parent registration", async () => {
    const parent = new Container();
    parent.register("db", () => "pg");
    const child = parent.createChild();
    child.register("db", () => "sqlite");
    expect(await child.resolve<string>("db")).toBe("sqlite");
  });

  it("throws for unregistered service", async () => {
    const c = new Container();
    await expect(c.resolve("missing")).rejects.toThrow("Service not registered");
  });

  it("checks has() across parent", () => {
    const parent = new Container();
    parent.registerInstance("x", 1);
    const child = parent.createChild();
    expect(child.has("x")).toBe(true);
    expect(child.has("y")).toBe(false);
  });

  it("clears all registrations", () => {
    const c = new Container();
    c.registerInstance("x", 1);
    c.clear();
    expect(c.has("x")).toBe(false);
  });
});

describe("EventBus", () => {
  it("emits and handles events", async () => {
    const bus = new EventBus();
    let called = false;
    bus.on("test", () => {
      called = true;
    });
    await bus.emit("test");
    expect(called).toBe(true);
  });

  it("passes payload to handler", async () => {
    const bus = new EventBus();
    let payload: unknown = null;
    bus.on<{ msg: string }>("test", (p) => {
      payload = p;
    });
    await bus.emit("test", { msg: "hello" });
    expect(payload).toEqual({ msg: "hello" });
  });

  it("supports unsubscribe", async () => {
    const bus = new EventBus();
    let count = 0;
    const unsub = bus.on("test", () => {
      count++;
    });
    await bus.emit("test");
    unsub();
    await bus.emit("test");
    expect(count).toBe(1);
  });

  it("runs middleware chain", async () => {
    const order: string[] = [];
    const bus = new EventBus({
      middleware: [
        async (_event, _payload, next) => {
          order.push("middleware1");
          await next();
        },
        async (_event, _payload, next) => {
          order.push("middleware2");
          await next();
        },
      ],
    });
    bus.on("test", () => {
      order.push("handler");
    });
    await bus.emit("test");
    expect(order).toEqual(["middleware1", "middleware2", "handler"]);
  });

  it("removes all handlers for an event", async () => {
    const bus = new EventBus();
    let count = 0;
    bus.on("test", () => {
      count++;
    });
    bus.removeAll("test");
    await bus.emit("test");
    expect(count).toBe(0);
  });
});

describe("Lifecycle", () => {
  it("transitions from init to ready", async () => {
    const lc = new Lifecycle();
    expect(lc.currentState).toBe("init");
    await lc.init();
    expect(lc.currentState).toBe("ready");
  });

  it("calls init hooks", async () => {
    const order: string[] = [];
    const lc = new Lifecycle({
      onInit: async () => {
        order.push("onInit");
      },
    });
    lc.onInit(async () => {
      order.push("hook");
    });
    await lc.init();
    expect(order).toEqual(["onInit", "hook"]);
  });

  it("calls ready hooks", async () => {
    const order: string[] = [];
    const lc = new Lifecycle();
    lc.onReady(async () => {
      order.push("ready");
    });
    await lc.init();
    await lc.ready();
    expect(order).toEqual(["ready"]);
  });

  it("calls shutdown hooks", async () => {
    const order: string[] = [];
    const lc = new Lifecycle({
      onShutdown: async () => {
        order.push("shutdown");
      },
    });
    await lc.init();
    await lc.shutdown();
    expect(order).toEqual(["shutdown"]);
    expect(lc.currentState).toBe("shutdown");
  });

  it("throws if init called from ready state", async () => {
    const lc = new Lifecycle();
    await lc.init();
    await expect(lc.init()).rejects.toThrow();
  });
});

describe("createLogger", () => {
  it("creates a logger with all methods", () => {
    const logger = createLogger({ level: "debug" });
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.fatal).toBe("function");
  });

  it("does not throw when calling methods", () => {
    const logger = createLogger();
    expect(() => logger.info("test")).not.toThrow();
    expect(() => logger.warn("test")).not.toThrow();
    expect(() => logger.error("test")).not.toThrow();
  });
});

describe("createConfigLoader", () => {
  it("creates a config loader with expected methods", () => {
    const loader = createConfigLoader();
    expect(typeof loader.load).toBe("function");
    expect(typeof loader.loadEnv).toBe("function");
    expect(typeof loader.loadFile).toBe("function");
  });
});
