// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as path from "path";
import * as tc from "@actions/tool-cache";

import { BicepCache } from "@azure/bicep-deploy-common";

const TOOL_NAME = "bicep";

export class ActionBicepCache implements BicepCache {
  async find(version: string): Promise<string | undefined> {
    const cached = tc.find(TOOL_NAME, version);
    if (cached) {
      return path.join(cached, getBinaryName());
    }

    return undefined;
  }

  async save(installedPath: string, version: string): Promise<string> {
    const cachedDir = await tc.cacheFile(
      installedPath,
      getBinaryName(),
      TOOL_NAME,
      version,
    );

    return path.join(cachedDir, getBinaryName());
  }
}

function getBinaryName(): string {
  return process.platform === "win32" ? "bicep.exe" : "bicep";
}
