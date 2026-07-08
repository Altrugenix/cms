export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AccessTokenPayload extends JwtPayload {
  type: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  type: "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthConfig {
  secret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface AuthUser {
  id: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  role?: string;
}
