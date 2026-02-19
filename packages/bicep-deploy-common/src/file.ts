// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Bicep, CompileResponseDiagnostic } from "bicep-node";

import { FileConfig } from "./config";
import { Logger } from "./logging";
import { errorMessages } from "./errorMessages";
import { loggingMessages } from "./loggingMessages";

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

async function resolveVersion(bicepVersion?: string): Promise<string> {
  if (bicepVersion) {
    return bicepVersion;
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

  return versionMatch.groups.version;
}

async function installBicep(
  cache: BicepCache,
  logger: Logger,
  bicepVersion?: string,
) {
  const resolvedVersion = await resolveVersion(bicepVersion);

  const cached = await cache.find(resolvedVersion);
  if (cached) {
    logger.logInfo(loggingMessages.bicepCacheHit(resolvedVersion, cached));
    return cached;
  }

  logger.logInfo(loggingMessages.bicepDownloading(resolvedVersion));
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
  const bicepPath = await installBicep(cache, logger, bicepVersion);

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
  const bicepPath = await installBicep(cache, logger, bicepVersion);

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

export async function getJsonParameters(config: FileConfig, logger: Logger) {
  const { parametersFile, parameters } = config;

  let contents;
  if (parametersFile) {
    logger.logInfo(loggingMessages.usingParametersFile(parametersFile));
    contents = JSON.parse(await fs.readFile(parametersFile, "utf8"));
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
    logger.logInfo(loggingMessages.usingParametersFile(parametersFile));
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

  if (
    parametersFile &&
    path.extname(parametersFile).toLowerCase() !== ".json"
  ) {
    throw new Error(errorMessages.unsupportedParametersFile(parametersFile));
  }

  const parameters = await getJsonParameters(config, logger);

  if (templateFile && path.extname(templateFile).toLowerCase() === ".bicep") {
    logger.logInfo(loggingMessages.usingTemplateFile(templateFile));
    const { template } = await compileBicep(
      templateFile,
      logger,
      cache,
      config.bicepVersion,
    );

    return parse({ template, parameters });
  }

  if (templateFile && path.extname(templateFile).toLowerCase() !== ".json") {
    throw new Error(errorMessages.unsupportedTemplateFile(templateFile));
  }

  if (!templateFile) {
    throw new Error(errorMessages.templateFileRequired);
  }

  logger.logInfo(loggingMessages.usingTemplateFile(templateFile));
  const template = await fs.readFile(templateFile, "utf8");

  return parse({ template, parameters });
}

export function parse(input: {
  parameters?: string;
  template?: string;
  templateSpecId?: string;
}): ParsedFiles {
  const { parameters, template, templateSpecId } = input;
  const parametersContents = parameters ? JSON.parse(parameters) : undefined;
  const templateContents = template ? JSON.parse(template) : undefined;

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
    if (diag.level === "Error") logger.logError(message);
    if (diag.level === "Warning") logger.logWarning(message);
    if (diag.level === "Info") logger.logInfo(message);
  }
}
