// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeploymentStackConfig } from "./config";
import { ParsedFiles } from "./file";
import { Logger } from "./logging";

import {
  defaultName,
  getDebugSetting,
  getStacksClient,
  getDeploymentStackResourceId,
  requireLocation,
} from "./utils";

import {
  DeploymentStack,
  DeploymentStacksWhatIfResult,
} from "@azure/arm-resourcesdeploymentstacks";

// The retention interval for what-if results is required by the service.
// Since we only need the result for the lifetime of this operation, we use the minimum allowed value.
const whatIfRetentionInterval = "PT3H";

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
      return await client.deploymentStacks.createOrUpdateAtResourceGroup(
        scope.resourceGroup,
        name,
        stack,
      );
    case "subscription":
      return await client.deploymentStacks.createOrUpdateAtSubscription(
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
      );
    case "managementGroup":
      return await client.deploymentStacks.createOrUpdateAtManagementGroup(
        scope.managementGroup,
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
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
      return await client.deploymentStacks.validateStackAtResourceGroup(
        scope.resourceGroup,
        name,
        stack,
      );
    case "subscription":
      return await client.deploymentStacks.validateStackAtSubscription(
        name,
        {
          ...stack,
          location: requireLocation(config),
        },
      );
    case "managementGroup":
      return await client.deploymentStacks.validateStackAtManagementGroup(
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
  const stackName = config.name ?? defaultName;
  const epochSeconds = Math.floor(Date.now() / 1000);
  const resultsName = `${stackName}-${epochSeconds}`;
  const scope = config.scope;
  const client = getStacksClient(config, scope, logger);
  const deploymentStackResourceId = getDeploymentStackResourceId(config);
  const whatIfResult = createStackWhatIfDefinition(
    config,
    files,
    deploymentStackResourceId,
  );

  switch (scope.type) {
    case "resourceGroup":
      await client.deploymentStacksWhatIfResultsAtResourceGroup.createOrUpdate(
        scope.resourceGroup,
        resultsName,
        whatIfResult,
      );
      return await client.deploymentStacksWhatIfResultsAtResourceGroup.whatIf(
        scope.resourceGroup,
        resultsName,
      );
    case "subscription":
      await client.deploymentStacksWhatIfResultsAtSubscription.createOrUpdate(
        resultsName,
        {
          ...whatIfResult,
          location: requireLocation(config),
        },
      );
      return await client.deploymentStacksWhatIfResultsAtSubscription.whatIf(
        resultsName,
      );
    case "managementGroup":
      await client.deploymentStacksWhatIfResultsAtManagementGroup.createOrUpdate(
        scope.managementGroup,
        resultsName,
        {
          ...whatIfResult,
          location: requireLocation(config),
        },
      );
      return await client.deploymentStacksWhatIfResultsAtManagementGroup.whatIf(
        scope.managementGroup,
        resultsName,
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
      return await client.deploymentStacks.deleteAtResourceGroup(
        scope.resourceGroup,
        name,
        deletionOptions,
      );
    case "subscription":
      return await client.deploymentStacks.deleteAtSubscription(
        name,
        deletionOptions,
      );
    case "managementGroup":
      return await client.deploymentStacks.deleteAtManagementGroup(
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
      debugSetting: getDebugSetting(config),
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
