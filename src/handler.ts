// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { setOutput, setFailed, setSecret } from "@actions/core";
import { RestError } from "@azure/core-rest-pipeline";

import { DeployConfig } from "../packages/bicep-deploy-common/src/config";
import { ParsedFiles } from "../packages/bicep-deploy-common/src/file";
import {
  logDiagnostics,
  tryWithErrorHandling,
  validateFileScope,
} from "../packages/bicep-deploy-common/src/utils";
import { Logger } from "../packages/bicep-deploy-common/src/logging";
import { formatWhatIfOperationResult } from "../packages/bicep-deploy-common/src/whatif";
import {
  deploymentCreate,
  deploymentValidate,
  deploymentWhatIf,
} from "../packages/bicep-deploy-common/src/deployments";
import {
  stackCreate,
  stackDelete,
  stackValidate,
} from "../packages/bicep-deploy-common/src/stacks";

export async function execute(
  config: DeployConfig,
  files: ParsedFiles,
  logger: Logger,
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
                setCreateOutputs(config, result?.properties?.outputs);
              },
              error => {
                logger.logError(JSON.stringify(error, null, 2));
                setFailed("Create failed");
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
                setFailed("Validation failed");
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
                setCreateOutputs(config, result?.properties?.outputs);
              },
              error => {
                logger.logError(JSON.stringify(error, null, 2));
                setFailed("Create failed");
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
                setFailed("Validation failed");
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
    if (error instanceof RestError && error.response?.bodyAsText) {
      const correlationId = error.response.headers.get(
        "x-ms-correlation-request-id",
      );
      logger.logError(`Request failed. CorrelationId: ${correlationId}`);

      const responseBody = JSON.parse(error.response.bodyAsText);
      logger.logError(JSON.stringify(responseBody, null, 2));
    }

    setFailed("Operation failed");
    throw error;
  }
}

function setCreateOutputs(
  config: DeployConfig,
  outputs?: Record<string, unknown>,
) {
  if (!outputs) {
    return;
  }

  for (const key of Object.keys(outputs)) {
    const output = outputs[key] as { value: string };
    setOutput(key, output.value);
    if (
      config.maskedOutputs &&
      config.maskedOutputs.some(x => x.toLowerCase() === key.toLowerCase())
    ) {
      setSecret(output.value);
    }
  }
}
