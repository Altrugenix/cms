import { describe, it, expect } from "vitest";

import { EventBus } from "../src/event-bus.js";

describe("EventBus — middleware chain branches", () => {
  it("single middleware calling next reaches handler", async () => {
    const order: string[] = [];
    const bus = new EventBus({
      middleware: [
        async (_e, _p, next) => {
          order.push("mw");
          await next();
        },
      ],
    });
    bus.on("ev", () => {
      order.push("handler");
    });
    await bus.emit("ev");
    expect(order).toEqual(["mw", "handler"]);
  });

  it("middleware without next still resolves", async () => {
    const bus = new EventBus({
      middleware: [
        async () => {
          // does not call next
        },
      ],
    });
    let called = false;
    bus.on("ev", () => {
      called = true;
    });
    await bus.emit("ev");
    expect(called).toBe(false);
  });

  it("emit without middleware calls handlers directly", async () => {
    const bus = new EventBus();
    let called = false;
    bus.on("ev", () => {
      called = true;
    });
    await bus.emit("ev");
    expect(called).toBe(true);
  });
});
