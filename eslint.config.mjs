// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// @ts-nocheck
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from '@vitest/eslint-plugin';
import notice from "eslint-plugin-notice";
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from "tsdown";

export default defineConfig({
  files: ["src/**/*.ts", "test/**/*.ts", "test-live/**/*.ts", "packages/**/*.ts"],
  extends: [
    eslint.configs.recommended,
    eslintPluginPrettierRecommended,
    ...tseslint.configs.recommended,
  ],
  languageOptions: {
    ecmaVersion: 2020,
    globals: {
      ...vitest.environments.env.globals,
    }
  },
  plugins: {
    notice,
    vitest
  },
  rules: {
    "notice/notice": [
      "error",
      {
        template: "// Copyright (c) Microsoft Corporation.\n// Licensed under the MIT License.\n",
      },
    ],
    ...vitest.configs.recommended.rules,
  },
});