// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  minify: true,
  sourcemap: true,
  outDir: 'dist',
  platform: 'node',
  target: 'es2021',
  format: ['cjs'],
  dts: true,
  // unbundling to expose internal modules for testing. bundling will break tests in other repos!
  unbundle: true,
  external: [
    /^@azure\//,
    /^bicep-node/,
    /^yaml/,
  ],
})