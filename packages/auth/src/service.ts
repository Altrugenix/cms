import type { DatabaseAdapter } from "@arche-cms/database";

import { randomBytes } from "node:crypto";

import type {
  AuthConfig,
  AuthUser,
  PublicUser,
  TokenPair,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./types.js";

import { JwtService } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";

const RESET_TOKENS_TABLE = "__cms_password_resets";
const USERS_TABLE = "__cms_users";

function toPublicUser(user: AuthUser): PublicUser {
  const { password: _, ...pub } = user;
  return pub as unknown as PublicUser;
}

function isAuthUser(row: Record<string, unknown>): boolean {
  const id = row.id;
  return (
    (typeof id === "string" || typeof id === "number") &&
    typeof row.email === "string" &&
    typeof row.password === "string" &&
    typeof row.role === "string"
  );
}

function castAuthUser(row: Record<string, unknown>): AuthUser {
  return row as unknown as AuthUser;
}

export class AuthService {
  private readonly jwt: JwtService;
  private readonly db: DatabaseAdapter;
  private initialized = false;

  constructor(db: DatabaseAdapter, config: AuthConfig) {
    this.db = db;
    this.jwt = new JwtService(config);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.db.createTable(USERS_TABLE, {
      createdAt: "TEXT NOT NULL",
      email: "TEXT NOT NULL UNIQUE",
      password: "TEXT NOT NULL",
      role: "TEXT NOT NULL DEFAULT 'editor'",
      updatedAt: "TEXT NOT NULL",
    });
    await this.db.createTable(RESET_TOKENS_TABLE, {
      createdAt: "TEXT NOT NULL",
      email: "TEXT NOT NULL",
      expiresAt: "TEXT NOT NULL",
      token: "TEXT NOT NULL",
    });
    this.initialized = true;
  }

  async seedDefaultAdmin(password: string): Promise<PublicUser | null> {
    const existing = await this.db.findMany(USERS_TABLE, { limit: 1 });
    if (existing.total > 0) return null;

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const created = await this.db.create(USERS_TABLE, {
      createdAt: now,
      email: "admin@arche-cms.com",
      password: passwordHash,
      role: "admin",
      updatedAt: now,
    });

    const { password: _, ...pub } = created;
    return pub as unknown as PublicUser;
  }

  async register(input: RegisterInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();
    const created = await this.db.create(USERS_TABLE, {
      createdAt: now,
      email: input.email,
      password: passwordHash,
      role: "editor",
      updatedAt: now,
    });

    if (!isAuthUser(created)) {
      throw new Error("Failed to create user");
    }

    const user = toPublicUser(castAuthUser(created));
    const tokens = await this.generateTokens(user);

    return { tokens, user };
  }

  async login(input: LoginInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const user = await this.findByEmail(input.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const valid = await verifyPassword(input.password, user.password);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const publicUser = toPublicUser(user);
    const tokens = await this.generateTokens(publicUser);

    return { tokens, user: publicUser };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.jwt.verifyRefreshToken(refreshToken);

    const user = await this.findById(payload.sub);
    if (!user) {
      throw new Error("User not found");
    }

    const publicUser = toPublicUser(user);
    return this.generateTokens(publicUser);
  }

  async me(userId: string): Promise<PublicUser | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    return toPublicUser(user);
  }

  async forgotPassword(
    input: ForgotPasswordInput,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.findByEmail(input.email);
    if (!user) {
      return { message: "If that email is registered, a reset link has been sent" };
    }

    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = await hashPassword(rawToken);
    const now = new Date();

    await this.db.create(RESET_TOKENS_TABLE, {
      createdAt: now.toISOString(),
      email: input.email,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      token: hashedToken,
    });

    return {
      message: "If that email is registered, a reset link has been sent",
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const tokens = await this.db.findMany(RESET_TOKENS_TABLE, { limit: 100 });
    const now = new Date();

    let matchedRecord: Record<string, unknown> | null = null;
    for (const record of tokens.data) {
      if (typeof record.token !== "string") continue;
      const isValid = await verifyPassword(input.token, record.token);
      if (isValid) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      throw new Error("Invalid or expired reset token");
    }

    const record = matchedRecord as { email: string; expiresAt: string; id: string };
    if (new Date(record.expiresAt) < now) {
      throw new Error("Reset token has expired");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.findByEmail(record.email);
    if (!user) {
      throw new Error("User not found");
    }

    await this.db.update(USERS_TABLE, user.id, {
      password: passwordHash,
      updatedAt: now.toISOString(),
    });

    await this.db.delete(RESET_TOKENS_TABLE, record.id);

    return { message: "Password has been reset successfully" };
  }

  async listUsers(): Promise<PublicUser[]> {
    const results = await this.db.findMany(USERS_TABLE);
    return results.data
      .filter((row): row is Record<string, unknown> & AuthUser => isAuthUser(row))
      .map((row) => toPublicUser(castAuthUser(row)));
  }

  async getUser(id: string): Promise<PublicUser | null> {
    const user = await this.findById(id);
    if (!user) return null;
    return toPublicUser(user);
  }

  async updateUser(
    id: string,
    data: { email?: string; role?: string; password?: string },
  ): Promise<PublicUser | null> {
    const user = await this.findById(id);
    if (!user) return null;
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }
    const updated = await this.db.update(USERS_TABLE, id, updateData);
    if (!updated || !isAuthUser(updated)) return null;
    return toPublicUser(castAuthUser(updated));
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.db.delete(USERS_TABLE, id);
  }

  private async findByEmail(email: string): Promise<AuthUser | null> {
    const results = await this.db.findMany(USERS_TABLE, {
      limit: 1,
      where: { email },
    });
    const row = results.data[0];
    if (!row || !isAuthUser(row)) return null;
    return castAuthUser(row);
  }

  private async findById(id: string): Promise<AuthUser | null> {
    const row = await this.db.findOne(USERS_TABLE, id);
    if (!row || !isAuthUser(row)) return null;
    return castAuthUser(row);
  }

  private async generateTokens(user: PublicUser): Promise<TokenPair> {
    const payload = { email: user.email, role: user.role, sub: user.id };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.generateAccessToken(payload),
      this.jwt.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }
}
