// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { defineConfig } from 'vitest/config'

const TEST_TIMEOUT_IN_SECONDS = 5 * 60; // 5 minutes
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/test-live/**/*.test.(ts)'],
    testTimeout: TEST_TIMEOUT_IN_SECONDS * 1000,
  },
});