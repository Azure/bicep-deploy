// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeploymentsConfig } from "./config";
import { ParsedFiles } from "./file";
import { Logger } from "./logging";
import { getDeploymentCreateClient } from "./azure";

import {
  defaultName,
  getDebugSetting,
  getDeploymentClient,
  requireLocation,
} from "./utils";

import { Deployment } from "@azure/arm-resourcesdeployments";

export async function deploymentCreate(
  config: DeploymentsConfig,
  files: ParsedFiles,
  logger: Logger,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getDeploymentCreateClient(config, scope, logger);
  const deployment = createDeploymentDefinition(config, files);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deployments.createOrUpdate(
        scope.resourceGroup,
        name,
        deployment,
      );
    case "subscription":
      return await client.deployments.createOrUpdateAtSubscriptionScope(name, {
        ...deployment,
        location: requireLocation(config),
      });
    case "managementGroup":
      return await client.deployments.createOrUpdateAtManagementGroupScope(
        scope.managementGroup,
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "tenant":
      return await client.deployments.createOrUpdateAtTenantScope(name, {
        ...deployment,
        location: requireLocation(config),
      });
  }
}

export async function deploymentValidate(
  config: DeploymentsConfig,
  files: ParsedFiles,
  logger: Logger,
) {
  const name = config.name ?? defaultName;
  const scope = config.scope;
  const client = getDeploymentClient(config, scope, logger);
  const deployment = createDeploymentDefinition(config, files);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deployments.validate(
        scope.resourceGroup,
        name,
        deployment,
      );
    case "subscription":
      return await client.deployments.validateAtSubscriptionScope(name, {
        ...deployment,
        location: requireLocation(config),
      });
    case "managementGroup":
      return await client.deployments.validateAtManagementGroupScope(
        scope.managementGroup,
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "tenant":
      await client.deployments.validateAtTenantScope(name, {
        ...deployment,
        location: requireLocation(config),
      });
  }
}

export async function deploymentWhatIf(
  config: DeploymentsConfig,
  files: ParsedFiles,
  logger: Logger,
) {
  const deploymentName = config.name ?? defaultName;
  const scope = config.scope;
  const client = getDeploymentClient(config, scope, logger);
  const deployment = createDeploymentDefinition(config, files, false);

  switch (scope.type) {
    case "resourceGroup":
      return await client.deployments.whatIf(
        scope.resourceGroup,
        deploymentName,
        deployment,
      );
    case "subscription":
      return await client.deployments.whatIfAtSubscriptionScope(
        deploymentName,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "managementGroup":
      return await client.deployments.whatIfAtManagementGroupScope(
        scope.managementGroup,
        deploymentName,
        {
          ...deployment,
          location: requireLocation(config),
        },
      );
    case "tenant":
      return await client.deployments.whatIfAtTenantScope(deploymentName, {
        ...deployment,
        location: requireLocation(config),
      });
  }
}

function createDeploymentDefinition(
  config: DeploymentsConfig,
  files: ParsedFiles,
  includeDebugSetting = true,
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
      validationLevel: config.validationLevel,
      debugSetting: includeDebugSetting ? getDebugSetting(config) : undefined,
    },
    tags: config.tags,
  };
}
