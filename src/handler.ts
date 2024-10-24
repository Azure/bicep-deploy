// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { setOutput, setFailed, setSecret } from "@actions/core";
import { CloudError, Deployment, ErrorResponse } from "@azure/arm-resources";
import { DeploymentStack } from "@azure/arm-resourcesdeploymentstacks";
import { RestError } from "@azure/core-rest-pipeline";

import {
  ActionConfig,
  DeploymentsConfig,
  DeploymentStackConfig,
  ManagementGroupScope,
  ResourceGroupScope,
  SubscriptionScope,
  TenantScope,
} from "./config";
import { ParsedFiles } from "./helpers/file";
import { createDeploymentClient, createStacksClient } from "./helpers/azure";
import { logError, logInfoRaw } from "./helpers/logging";
import { formatWhatIfOperationResult } from "./helpers/whatif";

const defaultName = "azure-bicep-deploy";

function getDeploymentClient(
  scope:
    | TenantScope
    | ManagementGroupScope
    | SubscriptionScope
    | ResourceGroupScope,
) {
  if (scope.type == "tenant" || scope.type == "managementGroup") {
    throw "Subscription ID is required"; // TODO how to handle this properly?
  }

  const { tenantId, subscriptionId } = scope;
  return createDeploymentClient(subscriptionId, tenantId);
}

function getStacksClient(
  scope:
    | TenantScope
    | ManagementGroupScope
    | SubscriptionScope
    | ResourceGroupScope,
) {
  if (scope.type == "tenant" || scope.type == "managementGroup") {
    throw "Subscription ID is required"; // TODO how to handle this properly?
  }

  const { tenantId, subscriptionId } = scope;
  return createStacksClient(subscriptionId, tenantId);
}

export async function execute(config: ActionConfig, files: ParsedFiles) {
  try {
    switch (config.type) {
      case "deployment": {
        switch (config.operation) {
          case "create": {
            await tryWithErrorHandling(
              async () => {
                const result = await deploymentCreate(config, files);
                setCreateOutputs(config, result?.properties?.outputs);
              },
              error => {
                logError(JSON.stringify(error, null, 2));
                setFailed("Create failed");
              },
            );
            break;
          }
          case "validate": {
            await tryWithErrorHandling(
              () => deploymentValidate(config, files),
              error => {
                logError(JSON.stringify(error, null, 2));
                setFailed("Validation failed");
              },
            );
            break;
          }
          case "whatIf": {
            const result = await deploymentWhatIf(config, files);
            const formatted = formatWhatIfOperationResult(result, "ansii");
            logInfoRaw(formatted);
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
                const result = await stackCreate(config, files);
                setCreateOutputs(config, result?.properties?.outputs);
              },
              error => {
                logError(JSON.stringify(error, null, 2));
                setFailed("Create failed");
              },
            );
            break;
          }
          case "validate": {
            await tryWithErrorHandling(
              () => stackValidate(config, files),
              error => {
                logError(JSON.stringify(error, null, 2));
                setFailed("Validation failed");
              },
            );
            break;
          }
          case "delete": {
            await stackDelete(config);
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
      logError(`Request failed. CorrelationId: ${correlationId}`);

      const responseBody = JSON.parse(error.response.bodyAsText);
      logError(JSON.stringify(responseBody, null, 2));
    }

    setFailed("Operation failed");
    throw error;
  }
}

function setCreateOutputs(
  config: ActionConfig,
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

async function deploymentCreate(config: DeploymentsConfig, files: ParsedFiles) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getDeploymentClient(scope);
  const deployment = getDeployment(config, files);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deployments.beginCreateOrUpdateAndWait(
        scope.resourceGroup,
        name,
        deployment,
      );
    case "subscription":
      return await client.deployments.beginCreateOrUpdateAtSubscriptionScopeAndWait(
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "managementGroup":
      return await client.deployments.beginCreateOrUpdateAtManagementGroupScopeAndWait(
        scope.managementGroup,
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "tenant":
      await client.deployments.beginCreateOrUpdateAtTenantScopeAndWait(name, {
        ...deployment,
        location: requireLocation(config),
      });
  }
}

async function deploymentValidate(
  config: DeploymentsConfig,
  files: ParsedFiles,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getDeploymentClient(scope);
  const deployment = getDeployment(config, files);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deployments.beginValidateAndWait(
        scope.resourceGroup,
        name,
        deployment,
      );
    case "subscription":
      return await client.deployments.beginValidateAtSubscriptionScopeAndWait(
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "managementGroup":
      return await client.deployments.beginValidateAtManagementGroupScopeAndWait(
        scope.managementGroup,
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "tenant":
      await client.deployments.beginValidateAtTenantScopeAndWait(name, {
        ...deployment,
        location: requireLocation(config),
      });
  }
}

async function deploymentWhatIf(config: DeploymentsConfig, files: ParsedFiles) {
  const deploymentName = config.name ?? defaultName;
  const scope = config.scope;
  const client = getDeploymentClient(scope);
  const deployment = getDeployment(config, files);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deployments.beginWhatIfAndWait(
        scope.resourceGroup,
        deploymentName,
        deployment,
      );
    case "subscription":
      return await client.deployments.beginWhatIfAtSubscriptionScopeAndWait(
        deploymentName,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "managementGroup":
      return await client.deployments.beginWhatIfAtManagementGroupScopeAndWait(
        scope.managementGroup,
        deploymentName,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "tenant":
      return await client.deployments.beginWhatIfAtTenantScopeAndWait(
        deploymentName,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
  }
}

function getDeployment(
  config: DeploymentsConfig,
  files: ParsedFiles,
): Deployment {
  const { templateContents, templateSpecId, parametersContents } = files;

  return {
    location: config.location,
    properties: {
      mode: "Incremental",
      template: templateContents,
      templateLink: templateSpecId
        ? {
            id: templateSpecId,
          }
        : undefined,
      parameters: parametersContents["parameters"],
      expressionEvaluationOptions: {
        scope: "inner",
      },
    },
    tags: config.tags,
  };
}

async function stackCreate(config: DeploymentStackConfig, files: ParsedFiles) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getStacksClient(scope);
  const stack = getStack(config, files);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deploymentStacks.beginCreateOrUpdateAtResourceGroupAndWait(
        scope.resourceGroup,
        name,
        stack,
      );
    case "subscription":
      return await client.deploymentStacks.beginCreateOrUpdateAtSubscriptionAndWait(
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
      );
    case "managementGroup":
      return await client.deploymentStacks.beginCreateOrUpdateAtManagementGroupAndWait(
        scope.managementGroup,
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
      );
  }
}

async function stackValidate(
  config: DeploymentStackConfig,
  files: ParsedFiles,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getStacksClient(scope);
  const stack = getStack(config, files);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deploymentStacks.beginValidateStackAtResourceGroupAndWait(
        scope.resourceGroup,
        name,
        stack,
      );
    case "subscription":
      return await client.deploymentStacks.beginValidateStackAtSubscriptionAndWait(
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
      );
    case "managementGroup":
      return await client.deploymentStacks.beginValidateStackAtManagementGroupAndWait(
        scope.managementGroup,
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
      );
  }
}

async function stackDelete(config: DeploymentStackConfig) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getStacksClient(scope);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deploymentStacks.beginDeleteAtResourceGroupAndWait(
        scope.resourceGroup,
        name,
      );
    case "subscription":
      return await client.deploymentStacks.beginDeleteAtSubscriptionAndWait(
        name,
      );
    case "managementGroup":
      return await client.deploymentStacks.beginDeleteAtManagementGroupAndWait(
        scope.managementGroup,
        name,
      );
  }
}

function getStack(
  config: DeploymentStackConfig,
  files: ParsedFiles,
): DeploymentStack {
  const { templateContents, templateSpecId, parametersContents } = files;

  return {
    properties: {
      template: templateContents,
      templateLink: templateSpecId
        ? {
            id: templateSpecId,
          }
        : undefined,
      parameters: parametersContents["parameters"],
      description: config.description,
      actionOnUnmanage: config.actionOnUnManage,
      denySettings: config.denySettings,
      bypassStackOutOfSyncError: config.bypassStackOutOfSyncError,
    },
    tags: config.tags,
  };
}

function requireLocation(config: ActionConfig) {
  // this just exists to make typescript's validation happy.
  // it should only be called in places where we've already validated the location is set.
  if (!config.location) {
    throw new Error("Location is required");
  }

  return config.location;
}

async function tryWithErrorHandling<T>(
  action: () => Promise<T>,
  onError: (error: ErrorResponse) => void,
): Promise<T | undefined> {
  try {
    return await action();
  } catch (ex) {
    if (ex instanceof RestError) {
      const correlationId = ex.response?.headers.get(
        "x-ms-correlation-request-id",
      );
      logError(`Request failed. CorrelationId: ${correlationId}`);

      const { error } = ex.details as CloudError;
      if (error) {
        onError(error);
        return;
      }
    }

    throw ex;
  }
}
