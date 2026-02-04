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
import { getTemplateAndParameters, ParsedFiles } from "./file";
import { Logger } from "./logging";
import { OutputSetter, setOutputs } from "./output";
import {
  errorMessages,
  ErrorMessageConfig,
  setErrorMessages,
} from "./errorMessages";
import {
  loggingMessages,
  LoggingMessageConfig,
  setLoggingMessages,
} from "./loggingMessages";

export async function execute(
  config: DeployConfig,
  logger: Logger,
  outputSetter: OutputSetter,
  customErrorMessages?: Partial<ErrorMessageConfig>,
  customLoggingMessages?: Partial<LoggingMessageConfig>,
) {
  if (customErrorMessages) {
    setErrorMessages(customErrorMessages);
  }

  if (customLoggingMessages) {
    setLoggingMessages(customLoggingMessages);
  }

  let files: ParsedFiles = {};

  try {
    if (config.operation !== "delete") {
      // Get template and parameters only for non-delete operations
      files = await getTemplateAndParameters(config, logger);
      validateFileScope(config, files);
    } else if (config.parametersFile || config.templateFile) {
      // Log a message if files are provided for a delete operation
      logger.logWarning(loggingMessages.filesIgnoredForDelete);
    }

    switch (config.type) {
      case "deployment": {
        switch (config.operation) {
          case "create": {
            await tryWithErrorHandling(
              async () => {
                const result = await deploymentCreate(config, files, logger);
                setOutputs(config, outputSetter, result?.properties?.outputs);
              },
              error => {
                logger.logError(JSON.stringify(error, null, 2));
                outputSetter.setFailed(errorMessages.createFailed);
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
                outputSetter.setFailed(errorMessages.validationFailed);
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
                setOutputs(config, outputSetter, result?.properties?.outputs);
              },
              error => {
                logger.logError(JSON.stringify(error, null, 2));
                outputSetter.setFailed(errorMessages.createFailed);
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
                outputSetter.setFailed(errorMessages.validationFailed);
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
    if (isRestError(error) && error.response?.bodyAsText) {
      const correlationId = error.response.headers.get(
        "x-ms-correlation-request-id",
      );
      logger.logError(
        errorMessages.requestFailedCorrelation(correlationId ?? "unknown"),
      );

      const responseBody = JSON.parse(error.response.bodyAsText);
      logger.logError(JSON.stringify(responseBody, null, 2));
    }

    outputSetter.setFailed(errorMessages.operationFailed);
    throw error;
  }
}
