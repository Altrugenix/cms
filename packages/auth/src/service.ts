import type { DatabaseAdapter } from "@altrugenix/database";
import { JwtService } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";
import type {
  AuthConfig,
  AuthUser,
  PublicUser,
  TokenPair,
  LoginInput,
  RegisterInput,
} from "./types.js";

const USERS_TABLE = "__cms_users";

function toPublicUser(user: AuthUser): PublicUser {
  const { password: _, ...pub } = user;
  return pub as unknown as PublicUser;
}

function isAuthUser(row: Record<string, unknown>): boolean {
  return (
    typeof row.id === "string" &&
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

  constructor(db: DatabaseAdapter, config: AuthConfig) {
    this.db = db;
    this.jwt = new JwtService(config);
  }

  async register(input: RegisterInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();
    const created = await this.db.create(USERS_TABLE, {
      email: input.email,
      password: passwordHash,
      role: input.role ?? "editor",
      createdAt: now,
      updatedAt: now,
    });

    if (!isAuthUser(created)) {
      throw new Error("Failed to create user");
    }

    const user = toPublicUser(castAuthUser(created));
    const tokens = await this.generateTokens(user);

    return { user, tokens };
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

    return { user: publicUser, tokens };
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

  private async findByEmail(email: string): Promise<AuthUser | null> {
    const results = await this.db.findMany(USERS_TABLE, {
      where: { email },
      limit: 1,
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
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.generateAccessToken(payload),
      this.jwt.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }
}
