// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { isRestError } from "@azure/core-rest-pipeline";

import { DeployConfig } from "./config";
import {
  deploymentCreate,
  deploymentValidate,
  deploymentWhatIf,
} from "./deployments";
import { stackCreate, stackDelete, stackValidate } from "./stacks";
import { formatWhatIfOperationResult } from "./whatif";
import {
  logDiagnostics,
  validateFileScope,
  tryWithErrorHandling,
} from "./utils";
import { ParsedFiles } from "./file";
import { Logger } from "./logging";
import { OutputSetter, setCreateOutputs } from "./output";

export async function execute(
  config: DeployConfig,
  files: ParsedFiles,
  logger: Logger,
  outputSetter: OutputSetter,
) {
  try {
    validateFileScope(config, files);
    switch (config.type) {
      case "deployment": {
        switch (config.operation) {
          case "create": {
            await tryWithErrorHandling(
              async () => {
                const result = await deploymentCreate(config, files, logger);
                setCreateOutputs(
                  config,
                  outputSetter,
                  result?.properties?.outputs,
                );
              },
              error => {
                logger.logError(JSON.stringify(error, null, 2));
                outputSetter.setFailed("Create failed");
              },
              logger,
            );
            break;
          }
          case "validate": {
            await tryWithErrorHandling(
              async () => {
                const result = await deploymentValidate(config, files, logger);
                logDiagnostics(result?.properties?.diagnostics ?? [], logger);
              },
              error => {
                logger.logError(JSON.stringify(error, null, 2));
                outputSetter.setFailed("Validation failed");
              },
              logger,
            );
            break;
          }
          case "whatIf": {
            const result = await deploymentWhatIf(config, files, logger);
            const formatted = formatWhatIfOperationResult(result, "ansii");
            logger.logInfoRaw(formatted);
            logDiagnostics(result.diagnostics ?? [], logger);
            break;
          }
        }
        break;
      }
      case "deploymentStack": {
        switch (config.operation) {
          case "create": {
            await tryWithErrorHandling(
              async () => {
                const result = await stackCreate(config, files, logger);
                setCreateOutputs(
                  config,
                  outputSetter,
                  result?.properties?.outputs,
                );
              },
              error => {
                logger.logError(JSON.stringify(error, null, 2));
                outputSetter.setFailed("Create failed");
              },
              logger,
            );
            break;
          }
          case "validate": {
            await tryWithErrorHandling(
              () => stackValidate(config, files, logger),
              error => {
                logger.logError(JSON.stringify(error, null, 2));
                outputSetter.setFailed("Validation failed");
              },
              logger,
            );
            break;
          }
          case "delete": {
            await stackDelete(config, logger);
            break;
          }
        }
        break;
      }
    }
  } catch (error) {
    console.log("In execute catch:", error);
    if (isRestError(error) && error.response?.bodyAsText) {
      const correlationId = error.response.headers.get(
        "x-ms-correlation-request-id",
      );
      logger.logError(`Request failed. CorrelationId: ${correlationId}`);

      const responseBody = JSON.parse(error.response.bodyAsText);
      logger.logError(JSON.stringify(responseBody, null, 2));
    }

    outputSetter.setFailed("Operation failed");
    throw error;
  }
}
