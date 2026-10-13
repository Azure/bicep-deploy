// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// @ts-nocheck
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from '@vitest/eslint-plugin';
import globals from "globals";
import header from "eslint-plugin-header";
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

const compatibleHeader = {
  ...header,
  rules: {
    ...header.rules,
    header: {
      ...header.rules.header,
      meta: {
        ...header.rules.header.meta,
        schema: [
          { type: "string" },
          {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: ["string", "object"] } },
            ],
          },
          { type: "integer", minimum: 0 },
          { type: "object" },
        ],
      },
      create(context) {
        const legacyContext = new Proxy(context, {
          get(target, property) {
            if (property === "getSourceCode") {
              return () => target.sourceCode;
            }

            const value = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });

        return header.rules.header.create(legacyContext);
      },
    },
  },
};

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts", "test-live/**/*.ts", "packages/**/*.{ts,cts}"],
    languageOptions: {
      ecmaVersion: 2020,
      parserOptions: {
        projectService: true,
      },
      globals: {
        ...vitest.environments.env.globals,
      }
    },
    plugins: {
      header: compatibleHeader,
      vitest
    },
    rules: {
      "@typescript-eslint/no-deprecated": "error",
      "header/header": [
        "error",
        "line",
        [
          " Copyright (c) Microsoft Corporation.",
          " Licensed under the MIT License.",
        ],
      ],
      ...vitest.configs.recommended.rules,
    },
  },
  {
    files: ["packages/**/test-consumer/**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: globals.node,
    },
    plugins: {
      header: compatibleHeader,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "header/header": [
        "error",
        "line",
        [
          " Copyright (c) Microsoft Corporation.",
          " Licensed under the MIT License.",
        ],
      ],
    },
  }
];