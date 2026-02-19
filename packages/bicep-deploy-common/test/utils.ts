// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as fs from "fs";
import path from "path";
import { BicepCache } from "../src/file";

export function readTestFile(relativePath: string): string {
  const fullPath = path.join(__dirname, relativePath);

  return fs.readFileSync(fullPath, { encoding: "utf8" });
}

export const noopCache: BicepCache = {
  find: async () => undefined,
  save: async installedPath => installedPath,
};
