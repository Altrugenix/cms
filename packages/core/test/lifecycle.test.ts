import { describe, it, expect } from "vitest";

import { Lifecycle } from "../src/lifecycle.js";

describe("Lifecycle", () => {
  it("registers onShutdown hook via method", async () => {
    const order: string[] = [];
    const lc = new Lifecycle();
    lc.onShutdown(async () => {
      order.push("shutdown-hook");
    });
    await lc.init();
    await lc.shutdown();
    expect(order).toEqual(["shutdown-hook"]);
  });

  it("throws when ready() called from init state", async () => {
    const lc = new Lifecycle();
    await expect(lc.ready()).rejects.toThrow("Cannot ready from state: init");
  });

  it("throws when shutdown called from init (non-ready) state", async () => {
    const lc = new Lifecycle();
    await expect(lc.shutdown()).rejects.toThrow("Shutdown from unexpected state: init");
  });

  it("shutdown is idempotent when already in shutdown state", async () => {
    const lc = new Lifecycle();
    await lc.init();
    await lc.shutdown();
    await lc.shutdown();
    expect(lc.currentState).toBe("shutdown");
  });

  it("init from shutdown state throws", async () => {
    const lc = new Lifecycle();
    await lc.init();
    await lc.shutdown();
    await expect(lc.init()).rejects.toThrow("Cannot init from state: shutdown");
  });
});
