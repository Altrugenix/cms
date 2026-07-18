import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettierConfig from "eslint-config-prettier";
import noSecrets from "eslint-plugin-no-secrets";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import perfectionist from "eslint-plugin-perfectionist";
import security from "eslint-plugin-security";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/.fallow/**",
      "**/.vitepress/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      "no-secrets": noSecrets,
      "no-unsanitized": noUnsanitized,
      perfectionist,
      security,
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/return-await": "off",
      "max-depth": ["warn", 3],
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["warn", 4],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-secrets/no-secrets": "error",
      "no-unsanitized/property": "error",
      "perfectionist/sort-imports": "error",
      "perfectionist/sort-objects": "warn",
      "security/detect-child-process": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-object-injection": "off",
      "security/detect-unsafe-regex": "error",
    },
  },
  {
    files: ["packages/*/src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
      "@typescript-eslint/no-deprecated": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/no-unnecessary-type-conversion": "warn",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-disabled-tests": "warn",
      "vitest/no-focused-tests": "error",
      "vitest/expect-expect": "warn",
      "vitest/no-identical-title": "error",
      "vitest/prefer-expect-assertions": "off",
      "vitest/valid-expect": "error",
    },
  },
  prettierConfig,
);
