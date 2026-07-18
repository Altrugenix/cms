import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      exclude: [
        "**/types.ts",
        "**/src/types/**",
        "**/vitest.config.ts",
        "**/bin/**",
        "**/dist/**",
        "src/admin/**",
      ],
      include: ["src/**/*.ts"],
      provider: "v8",
      thresholds: {
        branches: 50,
        functions: 60,
        lines: 60,
        statements: 60,
      },
    },
    hookTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    sequence: {
      concurrent: false,
    },
    testTimeout: 30000,
  },
});
