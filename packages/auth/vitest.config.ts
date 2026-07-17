import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      all: true,
      exclude: ["**/types.ts", "**/src/types/**", "**/vitest.config.ts", "**/bin/**", "**/dist/**"],
      include: ["src/**/*.ts"],
      provider: "v8",
    },
    setupFiles: ["./test/vitest.setup.ts"],
    testTimeout: 30000,
  },
});
