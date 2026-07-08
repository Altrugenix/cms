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
  };
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || "0.0.0.0",
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    },
    rateLimit: {
      max: Number(process.env.RATE_LIMIT_MAX) || 100,
      timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
    },
    swagger: {
      title: process.env.SWAGGER_TITLE || "Altrugenix CMS API",
      version: process.env.SWAGGER_VERSION || "0.1.0",
      description: process.env.SWAGGER_DESCRIPTION || "Auto-generated REST API",
    },
    schema: {
      baseDir: process.env.SCHEMA_DIR || "./cms",
    },
    database: {
      adapter: (process.env.DB_ADAPTER as ServerConfig["database"]["adapter"]) || "sqlite",
      url: process.env.DB_URL || "file:./cms.db",
    },
    auth: {
      secret: process.env.AUTH_SECRET || "dev-secret-change-in-production-min-32-chars!!",
      accessTokenExpiresIn: process.env.AUTH_ACCESS_EXPIRES || "15m",
      refreshTokenExpiresIn: process.env.AUTH_REFRESH_EXPIRES || "7d",
    },
  };
}
