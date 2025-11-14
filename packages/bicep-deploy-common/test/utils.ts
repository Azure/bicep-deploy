// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as fs from "fs";
import path from "path";

export function readTestFile(relativePath: string): string {
  const fullPath = path.join(__dirname, relativePath);

  return fs.readFileSync(fullPath, { encoding: "utf8" });
}
