// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as fs from "fs/promises";
import fsSync from "fs";
import * as path from "path";
import { parse as parseJsonc } from "jsonc-parser";

import { VersionRange } from "./versionRange";
import { errorMessages } from "./errorMessages";

const CONFIG_FILE_NAME = "bicepconfig.json";

// Matches Bicep.Core's "extends" chain depth limit.
export const MAX_EXTENDS_DEPTH = 64;

export type ResolvedConfigChain = {
  /** The "bicep.version" constraint declared by the nearest layer in the chain that sets it, if any. */
  bicepVersionRange?: VersionRange;
  /** The path of the config file that declared "bicep.version" (the layer nearest the leaf). */
  declaringConfigPath?: string;
};

type ConfigLayer = {
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

/**
 * Walks up from the directory containing `sourceFilePath` to find the nearest `bicepconfig.json`,
 * resolves its "extends" chain, and returns the effective "bicep.version" constraint (the value
 * declared by the layer nearest the leaf that sets it).
 *
 * Returns an empty result (no error) if no `bicepconfig.json` is found at all, since a version
 * constraint is optional.
 */
export async function resolveConfigChain(
  sourceFilePath: string,
): Promise<ResolvedConfigChain> {
  const nearestConfigPath = findNearestConfigFile(
    path.dirname(path.resolve(sourceFilePath)),
  );

  if (!nearestConfigPath) {
    return {};
  }

  const chain = await walkExtendsChain(nearestConfigPath);

  return resolveBicepVersion(chain);
}

/**
 * Searches `startDir` and each of its ancestors, in order, for a `bicepconfig.json` file. Returns
 * the first one found, or undefined if none exists all the way up to the filesystem root.
 */
function findNearestConfigFile(startDir: string): string | undefined {
  let dir = startDir;

  for (;;) {
    const candidate = path.join(dir, CONFIG_FILE_NAME);
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      // Reached the filesystem root without finding a config file.
      return undefined;
    }
    dir = parent;
  }
}

/**
 * Reads `configPath` and follows its "extends" property (if any) to build the full chain of
 * config layers, nearest-to-the-leaf first. Throws if the chain contains a cycle, exceeds
 * MAX_EXTENDS_DEPTH, references a missing file, or uses an absolute "extends" path (Bicep
 * only supports relative "extends" paths).
 */
async function walkExtendsChain(configPath: string): Promise<ConfigLayer[]> {
  const chain: ConfigLayer[] = [];
  const visited = new Set<string>();

  let currentPath: string | undefined = path.resolve(configPath);

  while (currentPath) {
    if (visited.has(currentPath)) {
      throw new Error(errorMessages.configChainCycleDetected(currentPath));
    }
    if (chain.length >= MAX_EXTENDS_DEPTH) {
      throw new Error(errorMessages.configChainTooDeep(MAX_EXTENDS_DEPTH));
    }
    visited.add(currentPath);

    if (!fsSync.existsSync(currentPath)) {
      throw new Error(errorMessages.configFileNotFound(currentPath));
    }

    const raw = await fs.readFile(currentPath, "utf8");
    const data = parseJsonc(raw, undefined, { allowTrailingComma: true }) ?? {};
    chain.push({ path: currentPath, data });

    const extendsValue = data.extends;
    if (extendsValue === undefined) {
      break;
    }
    if (typeof extendsValue !== "string") {
      throw new Error(errorMessages.invalidConfigExtendsValue(currentPath));
    }
    if (path.isAbsolute(extendsValue)) {
      throw new Error(
        errorMessages.configChainAbsoluteExtendsPath(extendsValue, currentPath),
      );
    }

    currentPath = path.resolve(path.dirname(currentPath), extendsValue);
  }

  return chain;
}

/**
 * Resolves the effective "bicep.version" from a chain of config layers. The layer nearest the
 * leaf that declares "bicep.version" wins
 */
function resolveBicepVersion(chain: ConfigLayer[]): ResolvedConfigChain {
  for (const layer of chain) {
    const versionString = layer.data?.bicep?.version;
    if (versionString === undefined) {
      continue;
    }
    if (typeof versionString !== "string") {
      throw new Error(
        errorMessages.invalidBicepVersionConstraintType(layer.path),
      );
    }

    const range = VersionRange.tryParse(versionString);
    if (!range) {
      throw new Error(
        errorMessages.unparsableBicepVersionConstraint(
          versionString,
          layer.path,
        ),
      );
    }
    if (!range.isSatisfiable) {
      throw new Error(
        errorMessages.unsatisfiableBicepVersionConstraint(
          versionString,
          layer.path,
        ),
      );
    }

    return { bicepVersionRange: range, declaringConfigPath: layer.path };
  }

  return {};
}
