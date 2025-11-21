// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  DeployConfig,
  ManagementGroupScope,
  ResourceGroupScope,
  ScopeType,
  SubscriptionScope,
  TenantScope,
} from "./config";
import { createDeploymentClient, createStacksClient } from "./azure";

import {
  CloudError,
  DeploymentDiagnosticsDefinition,
  ErrorResponse,
} from "@azure/arm-resources";
import { OperationOptions } from "@azure/core-client";
import { PipelineResponse, RestError } from "@azure/core-rest-pipeline";

import { Logger } from "./logging";
import { ParsedFiles } from "./file";

export const defaultName = "azure-bicep-deploy";

export function getDeploymentClient(
  config: DeployConfig,
  scope:
    | TenantScope
    | ManagementGroupScope
    | SubscriptionScope
    | ResourceGroupScope,
  logger: Logger,
) {
  const { tenantId } = scope;
  const subscriptionId =
    "subscriptionId" in scope ? scope.subscriptionId : undefined;

  return createDeploymentClient(config, logger, subscriptionId, tenantId);
}

export function getStacksClient(
  config: DeployConfig,
  scope:
    | TenantScope
    | ManagementGroupScope
    | SubscriptionScope
    | ResourceGroupScope,
  logger: Logger,
) {
  const { tenantId } = scope;
  const subscriptionId =
    "subscriptionId" in scope ? scope.subscriptionId : undefined;

  return createStacksClient(config, logger, subscriptionId, tenantId);
}

// workaround until we're able to pick up https://github.com/Azure/azure-sdk-for-js/pull/25500
export function getCreateOperationOptions(): OperationOptions {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onResponse: (rawResponse, flatResponse: any) => {
      if (
        flatResponse &&
        flatResponse.error &&
        flatResponse.error.code &&
        flatResponse.error.message
      ) {
        throw new CustomPollingError(flatResponse, rawResponse);
      }
    },
  };
}

// workaround until we're able to pick up https://github.com/Azure/azure-sdk-for-js/pull/25500
export class CustomPollingError {
  response: PipelineResponse;
  details: CloudError;
  constructor(details: CloudError, response: PipelineResponse) {
    this.details = details;
    this.response = response;
  }
}

export function requireLocation(config: DeployConfig) {
  // this just exists to make typescript's validation happy.
  // it should only be called in places where we've already validated the location is set.
  if (!config.location) {
    throw new Error("Location is required");
  }

  return config.location;
}

export function logDiagnostics(
  diagnostics: DeploymentDiagnosticsDefinition[],
  logger: Logger,
) {
  if (diagnostics.length === 0) {
    return;
  }

  logger.logInfo("Diagnostics returned by the API");

  for (const diagnostic of diagnostics) {
    const message = `[${diagnostic.level}] ${diagnostic.code}: ${diagnostic.message}`;
    switch (diagnostic.level.toLowerCase()) {
      case "error":
        logger.logError(message);
        break;
      case "warning":
        logger.logWarning(message);
        break;
      default:
        logger.logInfo(message);
        break;
    }
  }
}

export function validateFileScope(config: DeployConfig, files: ParsedFiles) {
  const scope = getScope(files);
  if (!scope) {
    return;
  }

  if (scope !== config.scope.type) {
    throw new Error(
      `The target scope ${scope} does not match the deployment scope ${config.scope.type}.`,
    );
  }
}

function getScope(files: ParsedFiles): ScopeType | undefined {
  const template = files.templateContents ?? {};
  const bicepGenerated = template.metadata?._generator?.name;
  const schema = template["$schema"];

  if (!bicepGenerated) {
    // loose validation for non-Bicep generated templates, to match Azure CLI behavior
    return;
  }

  const result =
    /https:\/\/schema\.management\.azure\.com\/schemas\/[0-9a-zA-Z-]+\/([a-zA-Z]+)Template\.json#?/.exec(
      schema,
    );
  const scopeMatch = result ? result[1].toLowerCase() : null;

  switch (scopeMatch) {
    case "tenantdeployment":
      return "tenant";
    case "managementgroupdeployment":
      return "managementGroup";
    case "subscriptiondeployment":
      return "subscription";
    case "deployment":
      return "resourceGroup";
    default:
      throw new Error(`Failed to determine deployment scope from Bicep file.`);
  }
}

export async function tryWithErrorHandling<T>(
  action: () => Promise<T>,
  onError: (error: ErrorResponse) => void,
  logger: Logger,
): Promise<T | undefined> {
  try {
    return await action();
  } catch (ex) {
    if (ex instanceof RestError) {
      const correlationId = ex.response?.headers.get(
        "x-ms-correlation-request-id",
      );
      logger.logError(`Request failed. CorrelationId: ${correlationId}`);

      console.log("Calling onError with:", ex.details);
      const { error } = ex.details as CloudError;
      if (error) {
        console.log("somehow converted and threw?");
        onError(error);
        return;
      }
    }

    if (ex instanceof CustomPollingError) {
      const correlationId = ex.response?.headers.get(
        "x-ms-correlation-request-id",
      );
      logger.logError(`Request failed. CorrelationId: ${correlationId}`);

      const { error } = ex.details;
      if (error) {
        onError(error);
        return;
      }
    }

    throw ex;
  }
}
