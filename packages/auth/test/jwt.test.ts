import { describe, it, expect } from "vitest";
import { JwtService } from "../src/jwt.js";

const config = {
  secret: "test-secret-at-least-32-chars-long-for-security!!",
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "7d",
};

const testPayload = { sub: "user-1", email: "test@example.com", role: "admin" };

describe("JwtService", () => {
  it("generates and verifies an access token", async () => {
    const jwt = new JwtService(config);
    const token = await jwt.generateAccessToken(testPayload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const decoded = await jwt.verifyAccessToken(token);
    expect(decoded.sub).toBe("user-1");
    expect(decoded.email).toBe("test@example.com");
    expect(decoded.role).toBe("admin");
    expect(decoded.type).toBe("access");
  });

  it("generates and verifies a refresh token", async () => {
    const jwt = new JwtService(config);
    const token = await jwt.generateRefreshToken(testPayload);
    expect(typeof token).toBe("string");

    const decoded = await jwt.verifyRefreshToken(token);
    expect(decoded.sub).toBe("user-1");
    expect(decoded.type).toBe("refresh");
  });

  it("rejects an access token used as refresh token", async () => {
    const jwt = new JwtService(config);
    const token = await jwt.generateAccessToken(testPayload);
    await expect(jwt.verifyRefreshToken(token)).rejects.toThrow("Invalid token type");
  });

  it("rejects a refresh token used as access token", async () => {
    const jwt = new JwtService(config);
    const token = await jwt.generateRefreshToken(testPayload);
    await expect(jwt.verifyAccessToken(token)).rejects.toThrow("Invalid token type");
  });

  it("rejects a token with wrong secret", async () => {
    const jwt1 = new JwtService(config);
    const jwt2 = new JwtService({
      ...config,
      secret: "different-secret-that-is-also-long-enough!",
    });
    const token = await jwt1.generateAccessToken(testPayload);
    await expect(jwt2.verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const jwt = new JwtService({ ...config, accessTokenExpiresIn: "0s" });
    const token = await jwt.generateAccessToken(testPayload);

    await expect(jwt.verifyAccessToken(token)).rejects.toThrow();
  });
});
