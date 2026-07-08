import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/password.js";

describe("password hashing", () => {
  it("hashes and verifies a password correctly", async () => {
    const password = "secure-password-123!";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2b$")).toBe(true);

    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const hash = await hashPassword("correct-password");
    const valid = await verifyPassword("wrong-password", hash);
    expect(valid).toBe(false);
  });
});
