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
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
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
