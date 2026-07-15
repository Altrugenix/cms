import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
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
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts"],
      exclude: [
        "**/types.ts",
        "**/src/types/**",
        "**/vitest.config.ts",
        "**/bin/**",
        "**/dist/**",
        "src/admin/**",
      ],
    },
  },
});
