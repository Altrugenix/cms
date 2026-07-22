export interface ServerConfig {
  port: number;
  host: string;
  logger: {
    level: string;
  };
  cors: {
    origin: string | string[];
  };
  rateLimit: {
    max: number;
    timeWindow: string;
  };
  swagger: {
    title: string;
    version: string;
    description: string;
  };
  schema: {
    baseDir: string;
  };
  database: {
    adapter: "sqlite" | "postgres";
    url: string;
  };
  auth: {
    secret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    adminPassword?: string;
  };
  storage: {
    baseDir: string;
  };
}

export function loadConfig(): ServerConfig {
  return {
    auth: {
      accessTokenExpiresIn: process.env.AUTH_ACCESS_EXPIRES || "15m",
      refreshTokenExpiresIn: process.env.AUTH_REFRESH_EXPIRES || "7d",
      secret: (() => {
        const secret = process.env.AUTH_SECRET;
        if (!secret) {
          throw new Error(
            "AUTH_SECRET environment variable is required. Generate one with: openssl rand -hex 32",
          );
        }
        return secret;
      })(),
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    },
    database: {
      adapter: (process.env.DB_ADAPTER as ServerConfig["database"]["adapter"]) || "sqlite",
      url: process.env.DB_URL || "file:./cms.db",
    },
    host: process.env.HOST || "0.0.0.0",
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
    port: Number(process.env.PORT) || 3500,
    rateLimit: {
      max: Number(process.env.RATE_LIMIT_MAX) || 100,
      timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
    },
    schema: {
      baseDir: process.env.SCHEMA_DIR || "./cms",
    },
    storage: {
      baseDir: process.env.STORAGE_DIR || "./uploads",
    },
    swagger: {
      description: process.env.SWAGGER_DESCRIPTION || "Auto-generated REST API",
      title: process.env.SWAGGER_TITLE || "Arche CMS API",
      version: process.env.SWAGGER_VERSION || "0.1.0",
    },
  };
}
