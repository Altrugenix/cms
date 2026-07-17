import { describe, it, expect } from "vitest";

import { Container } from "../src/container.js";

describe("Container — resolve fallback to parent", () => {
  it("resolves from child when only parent has the registration", async () => {
    const parent = new Container();
    parent.register("service", () => "from-parent");
    const child = parent.createChild();
    expect(await child.resolve<string>("service")).toBe("from-parent");
  });

  it("has() returns false when no parent and service not registered", () => {
    const c = new Container();
    expect(c.has("nonexistent")).toBe(false);
  });

  it("resolve throws when no parent and service not registered", async () => {
    const c = new Container();
    await expect(c.resolve("missing")).rejects.toThrow("Service not registered: missing");
  });
});

describe("Container — registerInstance with falsy value triggers factory", () => {
  it("calls the internal factory when instance is null (falsy)", async () => {
    const c = new Container();
    c.registerInstance("nullable", null);
    const result = await c.resolve("nullable");
    expect(result).toBeNull();
  });

  it("calls the internal factory when instance is 0 (falsy)", async () => {
    const c = new Container();
    c.registerInstance("zero", 0);
    const result = await c.resolve("zero");
    expect(result).toBe(0);
  });

  it("calls the internal factory when instance is empty string (falsy)", async () => {
    const c = new Container();
    c.registerInstance("empty", "");
    const result = await c.resolve("empty");
    expect(result).toBe("");
  });

  it("calls the internal factory when instance is false (falsy)", async () => {
    const c = new Container();
    c.registerInstance("no", false);
    const result = await c.resolve("no");
    expect(result).toBe(false);
  });
});
