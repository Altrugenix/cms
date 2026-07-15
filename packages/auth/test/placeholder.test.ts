import { describe, it, expect } from "vitest";

describe("package exports", () => {
  it("exports JwtService", async () => {
    const mod = await import("../src/index.js");
    expect(mod.JwtService).toBeDefined();
    expect(typeof mod.JwtService).toBe("function");
  });

  it("exports AuthService", async () => {
    const mod = await import("../src/index.js");
    expect(mod.AuthService).toBeDefined();
    expect(typeof mod.AuthService).toBe("function");
  });

  it("exports hashPassword and verifyPassword", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.hashPassword).toBe("function");
    expect(typeof mod.verifyPassword).toBe("function");
  });

  it("exports all types (compile-time check)", async () => {
    const mod = await import("../src/index.js");
    // Types are erased at runtime — just verify no import errors
    expect(mod).toBeDefined();
  });
});

describe("types module", () => {
  it("loads types module without error", async () => {
    const mod = await import("../src/types.js");
    expect(mod).toBeDefined();
  });
});
