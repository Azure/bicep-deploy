// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeploymentsConfig } from "./config";
import { ParsedFiles } from "./file";
import { Logger } from "./logging";

import {
  defaultName,
  getDeploymentClient,
  getCreateOperationOptions,
  requireLocation,
} from "./utils";

import { Deployment } from "@azure/arm-resources";

export async function deploymentCreate(
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
      return await client.deployments.beginCreateOrUpdateAndWait(
        scope.resourceGroup,
        name,
        deployment,
        getCreateOperationOptions(),
      );
    case "subscription":
      return await client.deployments.beginCreateOrUpdateAtSubscriptionScopeAndWait(
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
        getCreateOperationOptions(),
      );
    case "managementGroup":
      return await client.deployments.beginCreateOrUpdateAtManagementGroupScopeAndWait(
        scope.managementGroup,
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
        getCreateOperationOptions(),
      );
    case "tenant":
      return await client.deployments.beginCreateOrUpdateAtTenantScopeAndWait(
        name,
        {
          ...deployment,
          location: requireLocation(config),
        },
        getCreateOperationOptions(),
      );
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

export async function deploymentWhatIf(
  config: DeploymentsConfig,
  files: ParsedFiles,
  logger: Logger,
) {
  const deploymentName = config.name ?? defaultName;
  const scope = config.scope;
  const client = getDeploymentClient(config, scope, logger);
  const deployment = createDeploymentDefinition(config, files);

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

function createDeploymentDefinition(
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
      validationLevel: config.validationLevel,
    },
    tags: config.tags,
  };
}
