// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeploymentStackConfig } from "./config";
import { ParsedFiles } from "./file";
import { Logger } from "./logging";

import {
  defaultName,
  getStacksClient,
  getCreateOperationOptions,
  requireLocation,
} from "./utils";

import { DeploymentStack } from "@azure/arm-resourcesdeploymentstacks";

export async function stackCreate(
  config: DeploymentStackConfig,
  files: ParsedFiles,
  logger: Logger,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getStacksClient(config, scope, logger);
  const stack = getStack(config, files);

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

export function getStack(
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

export function getStackDeletionOptions(config: DeploymentStackConfig) {
  return {
    unmanageActionResources: config.actionOnUnManage.resources,
    unmanageActionResourceGroups: config.actionOnUnManage.resourceGroups,
    unmanageActionManagementGroups: config.actionOnUnManage.managementGroups,
    bypassStackOutOfSyncError: config.bypassStackOutOfSyncError,
  };
}
