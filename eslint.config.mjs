// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// @ts-nocheck
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from '@vitest/eslint-plugin';
import headers from "eslint-plugin-headers";
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts", "test-live/**/*.ts", "packages/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...vitest.environments.env.globals,
      }
    },
    plugins: {
      headers,
      vitest
    },
    rules: {
      "headers/header-format": [
        "error",
        {
          source: "string",
          style: "line",
          content: "Copyright (c) Microsoft Corporation.\nLicensed under the MIT License.",
        },
      ],
    },
  }
];