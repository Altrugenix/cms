import { describe, it, expect } from "vitest";

import { EventBus } from "../src/event-bus.js";

describe("EventBus extended", () => {
  describe("handler errors", () => {
    it("does not reject emit when a handler throws", async () => {
      const bus = new EventBus();
      bus.on("test", () => {
        throw new Error("handler error");
      });
      await expect(bus.emit("test")).resolves.toBeUndefined();
    });

    it("does not reject emit when a handler rejects", async () => {
      const bus = new EventBus();
      bus.on("test", async () => {
        throw new Error("async handler error");
      });
      await expect(bus.emit("test")).resolves.toBeUndefined();
    });

    it("calls remaining handlers even if one fails", async () => {
      const bus = new EventBus();
      const calls: string[] = [];
      bus.on("test", async () => {
        calls.push("first");
        throw new Error("fail");
      });
      bus.on("test", async () => {
        calls.push("second");
      });
      await bus.emit("test");
      expect(calls).toContain("second");
    });
  });

  describe("off() specific handler", () => {
    it("removes a specific handler without affecting others", async () => {
      const bus = new EventBus();
      const calls: string[] = [];
      const h1 = () => {
        calls.push("h1");
      };
      const h2 = () => {
        calls.push("h2");
      };
      bus.on("test", h1);
      bus.on("test", h2);
      bus.off("test", h1);
      await bus.emit("test");
      expect(calls).toEqual(["h2"]);
    });

    it("does nothing when removing handler from unknown event", () => {
      const bus = new EventBus();
      const handler = () => {};
      expect(() => bus.off("nonexistent", handler)).not.toThrow();
    });
  });

  describe("emit with no handlers", () => {
    it("resolves when no handlers registered", async () => {
      const bus = new EventBus();
      await expect(bus.emit("empty")).resolves.toBeUndefined();
    });
  });

  describe("middleware edge cases", () => {
    it("middleware that does not call next prevents handlers", async () => {
      const bus = new EventBus({
        middleware: [
          async () => {
            // does not call next()
          },
        ],
      });
      let called = false;
      bus.on("test", () => {
        called = true;
      });
      await bus.emit("test");
      expect(called).toBe(false);
    });

    it("multiple middleware with one skipping next", async () => {
      const order: string[] = [];
      const bus = new EventBus({
        middleware: [
          async (_e, _p, next) => {
            order.push("m1");
            await next();
          },
          async () => {
            order.push("m2");
            // does not call next()
          },
          async (_e, _p, next) => {
            order.push("m3");
            await next();
          },
        ],
      });
      let handlerCalled = false;
      bus.on("test", () => {
        handlerCalled = true;
      });
      await bus.emit("test");
      expect(order).toEqual(["m1", "m2"]);
      expect(handlerCalled).toBe(false);
    });

    it("passes context parameter to handlers", async () => {
      const bus = new EventBus();
      let receivedContext: unknown = null;
      bus.on("test", (_p, ctx) => {
        receivedContext = ctx;
      });
      const context = { requestId: "abc" };
      await bus.emit("test", undefined, context);
      expect(receivedContext).toEqual(context);
    });
  });

  describe("removeAll", () => {
    it("clears all events when called without argument", async () => {
      const bus = new EventBus();
      let count = 0;
      bus.on("a", () => {
        count++;
      });
      bus.on("b", () => {
        count++;
      });
      bus.removeAll();
      await bus.emit("a");
      await bus.emit("b");
      expect(count).toBe(0);
    });
  });

  describe("on return unsubscribe", () => {
    it("the returned unsubscribe function removes the handler", async () => {
      const bus = new EventBus();
      let count = 0;
      const unsub = bus.on("test", () => {
        count++;
      });
      await bus.emit("test");
      expect(count).toBe(1);
      unsub();
      await bus.emit("test");
      await bus.emit("test");
      expect(count).toBe(1);
    });
  });

  describe("multiple handlers for same event", () => {
    it("all handlers are called on emit", async () => {
      const bus = new EventBus();
      const results: number[] = [];
      bus.on("add", (p: number) => {
        results.push(p * 2);
      });
      bus.on("add", (p: number) => {
        results.push(p * 3);
      });
      await bus.emit("add", 5);
      expect(results).toEqual([10, 15]);
    });
  });
});
