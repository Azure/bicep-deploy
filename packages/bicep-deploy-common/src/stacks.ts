// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeploymentStackConfig } from "./config";
import { ParsedFiles } from "./file";
import { Logger } from "./logging";

import {
  defaultName,
  getStacksClient,
  getCreateOperationOptions,
  getDeploymentStackResourceId,
  requireLocation,
} from "./utils";

import {
  DeploymentStack,
  DeploymentStacksWhatIfResult,
} from "@azure/arm-resourcesdeploymentstacks";

// the retention interval for what-if results is required by the service, and must be between
// 1 and 30 days. Since we only need the result for the lifetime of this operation, we use the
// minimum allowed value.
const whatIfRetentionInterval = "P1D";

export async function stackCreate(
  config: DeploymentStackConfig,
  files: ParsedFiles,
  logger: Logger,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getStacksClient(config, scope, logger);
  const stack = createStackDefinition(config, files);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deploymentStacks.beginCreateOrUpdateAtResourceGroupAndWait(
        scope.resourceGroup,
        name,
        stack,
        getCreateOperationOptions(),
      );
    case "subscription":
      return await client.deploymentStacks.beginCreateOrUpdateAtSubscriptionAndWait(
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
        getCreateOperationOptions(),
      );
    case "managementGroup":
      return await client.deploymentStacks.beginCreateOrUpdateAtManagementGroupAndWait(
        scope.managementGroup,
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
        getCreateOperationOptions(),
      );
  }
}

export async function stackValidate(
  config: DeploymentStackConfig,
  files: ParsedFiles,
  logger: Logger,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getStacksClient(config, scope, logger);
  const stack = createStackDefinition(config, files);

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

export async function stackWhatIf(
  config: DeploymentStackConfig,
  files: ParsedFiles,
  logger: Logger,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getStacksClient(config, scope, logger);
  const deploymentStackResourceId = getDeploymentStackResourceId(scope, name);
  const whatIfResult = createStackWhatIfDefinition(
    config,
    files,
    deploymentStackResourceId,
  );

  switch (scope.type) {
    case "resourceGroup":
      await client.deploymentStacksWhatIfResultsAtResourceGroup.beginCreateOrUpdateAndWait(
        scope.resourceGroup,
        name,
        whatIfResult,
      );
      return await client.deploymentStacksWhatIfResultsAtResourceGroup.beginWhatIfAndWait(
        scope.resourceGroup,
        name,
      );
    case "subscription":
      await client.deploymentStacksWhatIfResultsAtSubscription.beginCreateOrUpdateAndWait(
        name,
        {
          ...whatIfResult,
          location: requireLocation(config),
        },
      );
      return await client.deploymentStacksWhatIfResultsAtSubscription.beginWhatIfAndWait(
        name,
      );
    case "managementGroup":
      await client.deploymentStacksWhatIfResultsAtManagementGroup.beginCreateOrUpdateAndWait(
        scope.managementGroup,
        name,
        {
          ...whatIfResult,
          location: requireLocation(config),
        },
      );
      return await client.deploymentStacksWhatIfResultsAtManagementGroup.beginWhatIfAndWait(
        scope.managementGroup,
        name,
      );
  }
}

export async function stackDelete(
  config: DeploymentStackConfig,
  logger: Logger,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getStacksClient(config, scope, logger);
  const deletionOptions = getStackDeletionOptions(config);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deploymentStacks.beginDeleteAtResourceGroupAndWait(
        scope.resourceGroup,
        name,
        deletionOptions,
      );
    case "subscription":
      return await client.deploymentStacks.beginDeleteAtSubscriptionAndWait(
        name,
        deletionOptions,
      );
    case "managementGroup":
      return await client.deploymentStacks.beginDeleteAtManagementGroupAndWait(
        scope.managementGroup,
        name,
        deletionOptions,
      );
  }
}

function createStackDefinition(
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

function createStackWhatIfDefinition(
  config: DeploymentStackConfig,
  files: ParsedFiles,
  deploymentStackResourceId: string,
): DeploymentStacksWhatIfResult {
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
      deploymentStackResourceId: deploymentStackResourceId,
      retentionInterval: whatIfRetentionInterval,
    },
    tags: config.tags,
  };
}

function getStackDeletionOptions(config: DeploymentStackConfig) {
  return {
    unmanageActionResources: config.actionOnUnManage.resources,
    unmanageActionResourceGroups: config.actionOnUnManage.resourceGroups,
    unmanageActionManagementGroups: config.actionOnUnManage.managementGroups,
    bypassStackOutOfSyncError: config.bypassStackOutOfSyncError,
  };
}
