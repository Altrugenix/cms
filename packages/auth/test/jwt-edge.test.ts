import { describe, it, expect } from "vitest";

import { JwtService } from "../src/jwt.js";

const config = {
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "7d",
  secret: "test-secret-at-least-32-chars-long-for-security!!",
};

describe("JwtService edge cases", () => {
  it("throws for empty string token on verifyAccessToken", async () => {
    const jwt = new JwtService(config);
    await expect(jwt.verifyAccessToken("")).rejects.toThrow();
  });

  it("throws for empty string token on verifyRefreshToken", async () => {
    const jwt = new JwtService(config);
    await expect(jwt.verifyRefreshToken("")).rejects.toThrow();
  });

  it("throws for malformed token", async () => {
    const jwt = new JwtService(config);
    await expect(jwt.verifyAccessToken("not.a.token")).rejects.toThrow();
  });

  it("throws for token with missing claims", async () => {
    const jwt = new JwtService(config);
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(config.secret);
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).sign(secret);

    await expect(jwt.verifyAccessToken(token)).rejects.toThrow();
  });

  it("throws when type claim does not match", async () => {
    const jwt = new JwtService(config);
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(config.secret);
    const token = await new SignJWT({
      email: "test@test.com",
      role: "editor",
      sub: "1",
      type: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .sign(secret);

    await expect(jwt.verifyAccessToken(token)).rejects.toThrow("Invalid token type");
  });
});
