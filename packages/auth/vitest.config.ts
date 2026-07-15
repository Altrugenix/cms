import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/vitest.setup.ts"],
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["**/types.ts", "**/src/types/**", "**/vitest.config.ts", "**/bin/**", "**/dist/**"],
    },
  },
});
