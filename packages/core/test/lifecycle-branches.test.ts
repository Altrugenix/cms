import { describe, it, expect } from "vitest";
import { Lifecycle } from "../src/lifecycle.js";

describe("Lifecycle — constructor branch: onReady provided", () => {
  it("calls onReady hook from constructor options when ready() is invoked", async () => {
    const order: string[] = [];
    const lc = new Lifecycle({
      onReady: async () => {
        order.push("constructor-onReady");
      },
    });
    lc.onReady(async () => {
      order.push("method-onReady");
    });
    await lc.init();
    await lc.ready();
    expect(order).toEqual(["constructor-onReady", "method-onReady"]);
  });

  it("calls only constructor onReady when no method hooks registered", async () => {
    const called: string[] = [];
    const lc = new Lifecycle({
      onInit: async () => {
        called.push("init");
      },
      onReady: async () => {
        called.push("ready");
      },
      onShutdown: async () => {
        called.push("shutdown");
      },
    });
    await lc.init();
    await lc.ready();
    await lc.shutdown();
    expect(called).toEqual(["init", "ready", "shutdown"]);
  });
});
