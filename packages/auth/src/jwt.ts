import { SignJWT, jwtVerify } from "jose";

import type { AuthConfig, AccessTokenPayload, RefreshTokenPayload, JwtPayload } from "./types.js";

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export class JwtService {
  private readonly config: AuthConfig;
  private readonly key: Uint8Array;

  constructor(config: AuthConfig) {
    this.config = config;
    this.key = getSecretKey(config.secret);
  }

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    const token = await new SignJWT({ ...payload, type: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(this.config.accessTokenExpiresIn)
      .sign(this.key);

    return token;
  }

  async generateRefreshToken(payload: JwtPayload, expiresInSeconds?: number): Promise<string> {
    const expiry = expiresInSeconds ? `${expiresInSeconds}s` : this.config.refreshTokenExpiresIn;
    const token = await new SignJWT({ ...payload, type: "refresh" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiry)
      .sign(this.key);

    return token;
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.key);
    if (payload.type !== "access") {
      throw new Error("Invalid token type: expected access token");
    }
    return payload as unknown as AccessTokenPayload;
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const { payload } = await jwtVerify(token, this.key);
    if (payload.type !== "refresh") {
      throw new Error("Invalid token type: expected refresh token");
    }
    return payload as unknown as RefreshTokenPayload;
  }
}
