// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as fs from "fs/promises";
import fsSync from "fs";
import * as path from "path";
import * as os from "os";
import { parse as parseJsonc } from "jsonc-parser";
import { Bicep, CompileResponseDiagnostic } from "@azure/bicep-rpc-client";

import { FileConfig } from "./config";
import { resolveConfigChain } from "./configChain";
import { ExternalOutputSource, Logger } from "./logging";
import { errorMessages } from "./errorMessages";
import { loggingMessages } from "./loggingMessages";
import {
  SemanticVersion,
  selectHighestSatisfyingVersion,
} from "./versionRange";

export type ParsedFiles = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parametersContents?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateContents?: any;
  templateSpecId?: string;
};

export interface BicepCache {
  find(version: string): Promise<string | undefined>;
  save(installedPath: string, version: string): Promise<string>;
}

async function resolveVersion(
  logger: Logger,
  bicepVersion?: string,
  sourceFilePath?: string,
): Promise<{ version: string; source: ExternalOutputSource }> {
  const configChain = sourceFilePath
    ? await resolveConfigChain(sourceFilePath)
    : {};
  const { bicepVersionRange, declaringConfigPath } = configChain;

  if (bicepVersion) {
    // An explicit task/action input is honored unless it conflicts with a "bicep.version"
    // constraint declared in the repo's own bicepconfig.json chain, in which case we fail loudly
    // rather than silently pick one source over the other.
    if (bicepVersionRange && declaringConfigPath) {
      const parsedRequestedVersion = SemanticVersion.tryParse(bicepVersion);
      if (!parsedRequestedVersion) {
        logger.logExternalOutput(
          loggingMessages.bicepVersionConstraintCouldNotBeChecked(
            bicepVersion,
            bicepVersionRange.toString(),
            declaringConfigPath,
          ),
          { source: "repository", level: "warning" },
        );
      } else if (!bicepVersionRange.isSatisfiedBy(parsedRequestedVersion)) {
        throw new Error(
          errorMessages.bicepVersionConflictsWithConfigChain(
            bicepVersion,
            bicepVersionRange.toString(),
            declaringConfigPath,
          ),
        );
      }
    }

    return { version: bicepVersion, source: "repository" };
  }

  if (bicepVersionRange && declaringConfigPath) {
    // An exact pin (e.g. "1.2.3") already identifies a single installable version - there's no
    // need to cross-reference it against the published release list, which only covers the most
    // recent releases and would otherwise wrongly reject older-but-still-downloadable pins. Only
    // a genuine range (e.g. ">=1.2.0, <1.3.0") needs the release list, since resolving it requires
    // knowing which concrete releases actually exist.
    if (bicepVersionRange.isExactVersion) {
      const exactVersion = bicepVersionRange.lowerBound!.version.toString();

      logger.logExternalOutput(
        loggingMessages.bicepVersionResolvedFromConfigChain(
          exactVersion,
          bicepVersionRange.toString(),
          declaringConfigPath,
        ),
        { source: "repository", level: "info" },
      );

      return { version: exactVersion, source: "repository" };
    }

    const availableVersions = await Bicep.listReleases();
    const selectedVersion = selectHighestSatisfyingVersion(
      bicepVersionRange,
      availableVersions,
    );
    if (!selectedVersion) {
      throw new Error(
        errorMessages.noReleaseSatisfiesBicepVersionConstraint(
          bicepVersionRange.toString(),
          declaringConfigPath,
        ),
      );
    }

    logger.logExternalOutput(
      loggingMessages.bicepVersionResolvedFromConfigChain(
        selectedVersion,
        bicepVersionRange.toString(),
        declaringConfigPath,
      ),
      { source: "repository", level: "info" },
    );

    return { version: selectedVersion, source: "repository" };
  }

  // Bicep.getDownloadUrl() calls the lightweight https://downloads.bicep.azure.com/releases/latest
  // endpoint to resolve the latest tag, returning a URL like:
  //   https://downloads.bicep.azure.com/v0.32.4/bicep-linux-x64
  const url = await Bicep.getDownloadUrl();

  // Extract the version component between '/v' and the next '/' in the download URL.
  const versionMatch = url.match(/\/v(?<version>[^/]+)\//);
  if (!versionMatch || !versionMatch.groups?.version) {
    throw new Error(errorMessages.failedToResolveBicepVersion(url));
  }

  return { version: versionMatch.groups.version, source: "remote" };
}

async function installBicep(
  cache: BicepCache,
  logger: Logger,
  bicepVersion?: string,
  sourceFilePath?: string,
) {
  const { version: resolvedVersion, source: versionSource } =
    await resolveVersion(logger, bicepVersion, sourceFilePath);

  const cached = await cache.find(resolvedVersion);
  if (cached) {
    logger.logExternalOutput(
      loggingMessages.bicepCacheHit(resolvedVersion, cached),
      { source: versionSource, level: "info" },
    );
    return cached;
  }

  logger.logExternalOutput(loggingMessages.bicepDownloading(resolvedVersion), {
    source: versionSource,
    level: "info",
  });
  const bicepTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bicep-"));
  const bicepPath = await Bicep.install(bicepTmpDir, resolvedVersion);

  // Save to cache for future invocations, but return the original download
  // path for this run. This avoids a race condition when multiple parallel
  // processes download and cache the same version simultaneously — the cached
  // file could be overwritten mid-read by another process's cache.save() call.
  await cache.save(bicepPath, resolvedVersion);

  return bicepPath;
}

async function compileBicepParams(
  paramFilePath: string,
  logger: Logger,
  cache: BicepCache,
  parameters?: Record<string, unknown>,
  bicepVersion?: string,
) {
  const bicepPath = await installBicep(
    cache,
    logger,
    bicepVersion,
    paramFilePath,
  );

  const result = await withBicep(bicepPath, bicep =>
    bicep.compileParams({
      path: paramFilePath,
      parameterOverrides: parameters ?? {},
    }),
  );

  logDiagnostics(result.diagnostics, logger);

  if (!result.success) {
    throw `Failed to compile Bicep parameters file: ${paramFilePath}`;
  }

  return {
    parameters: result.parameters,
    template: result.template,
    templateSpecId: result.templateSpecId,
  };
}

async function compileBicep(
  templateFilePath: string,
  logger: Logger,
  cache: BicepCache,
  bicepVersion?: string,
) {
  const bicepPath = await installBicep(
    cache,
    logger,
    bicepVersion,
    templateFilePath,
  );

  const result = await withBicep(bicepPath, bicep =>
    bicep.compile({
      path: templateFilePath,
    }),
  );

  logDiagnostics(result.diagnostics, logger);

  if (!result.success) {
    throw `Failed to compile Bicep file: ${templateFilePath}`;
  }

  return { template: result.contents };
}

function isJsonLikeFile(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".json" || extension === ".jsonc";
}

export async function getJsonParameters(config: FileConfig, logger: Logger) {
  const { parametersFile, parameters } = config;

  let contents;
  if (parametersFile) {
    logger.logExternalOutput(
      loggingMessages.usingParametersFile(parametersFile),
      { source: "repository", level: "info" },
    );
    if (!fsSync.existsSync(parametersFile)) {
      throw new Error(errorMessages.parametersFileNotFound(parametersFile));
    }
    contents = parseJsonc(
      await fs.readFile(parametersFile, "utf8"),
      undefined,
      {
        allowTrailingComma: true,
      },
    );
  } else {
    contents = { parameters: {} };
  }

  for (const [key, value] of Object.entries(parameters ?? {})) {
    contents["parameters"][key] = { value };
  }

  return JSON.stringify(contents);
}

export async function getTemplateAndParameters(
  config: FileConfig,
  logger: Logger,
  cache: BicepCache,
) {
  const { parametersFile, templateFile } = config;

  if (
    parametersFile &&
    path.extname(parametersFile).toLowerCase() === ".bicepparam"
  ) {
    // .bicepparam includes template reference, so only log parameters file
    logger.logExternalOutput(
      loggingMessages.usingParametersFile(parametersFile),
      { source: "repository", level: "info" },
    );
    return parse(
      await compileBicepParams(
        parametersFile,
        logger,
        cache,
        config.parameters,
        config.bicepVersion,
      ),
    );
  }

  if (parametersFile && !isJsonLikeFile(parametersFile)) {
    throw new Error(errorMessages.unsupportedParametersFile(parametersFile));
  }

  const parameters = await getJsonParameters(config, logger);

  if (templateFile && path.extname(templateFile).toLowerCase() === ".bicep") {
    logger.logExternalOutput(loggingMessages.usingTemplateFile(templateFile), {
      source: "repository",
      level: "info",
    });
    const { template } = await compileBicep(
      templateFile,
      logger,
      cache,
      config.bicepVersion,
    );

    return parse({ template, parameters });
  }

  if (templateFile && !isJsonLikeFile(templateFile)) {
    throw new Error(errorMessages.unsupportedTemplateFile(templateFile));
  }

  if (!templateFile) {
    throw new Error(errorMessages.templateFileRequired);
  }

  logger.logExternalOutput(loggingMessages.usingTemplateFile(templateFile), {
    source: "repository",
    level: "info",
  });
  const template = await fs.readFile(templateFile, "utf8");

  return parse({ template, parameters });
}

export function parse(input: {
  parameters?: string;
  template?: string;
  templateSpecId?: string;
}): ParsedFiles {
  const { parameters, template, templateSpecId } = input;
  const parametersContents = parameters
    ? parseJsonc(parameters, undefined, { allowTrailingComma: true })
    : undefined;
  const templateContents = template
    ? parseJsonc(template, undefined, { allowTrailingComma: true })
    : undefined;

  return { parametersContents, templateContents, templateSpecId };
}

async function withBicep<T>(
  bicepPath: string,
  action: (bicep: Bicep) => Promise<T>,
): Promise<T> {
  const bicep = await Bicep.initialize(bicepPath);

  try {
    return await action(bicep);
  } finally {
    bicep.dispose();
  }
}

export function resolvePath(fileName: string) {
  return path.resolve(fileName);
}

function logDiagnostics(
  diagnostics: CompileResponseDiagnostic[],
  logger: Logger,
) {
  for (const diag of diagnostics) {
    const message = `${diag.source}(${diag.range.start.line + 1},${diag.range.start.char + 1}) : ${diag.level} ${diag.code}: ${diag.message}`;
    if (diag.level === "Error")
      logger.logExternalOutput(message, {
        source: "childProcess",
        level: "error",
      });
    if (diag.level === "Warning")
      logger.logExternalOutput(message, {
        source: "childProcess",
        level: "warning",
      });
    if (diag.level === "Info")
      logger.logExternalOutput(message, {
        source: "childProcess",
        level: "info",
      });
  }
}
