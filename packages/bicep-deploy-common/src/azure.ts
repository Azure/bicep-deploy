// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ResourceManagementClient } from "@azure/arm-resources";
import { DeploymentStacksClient } from "@azure/arm-resourcesdeploymentstacks";
import {
  ChainedTokenCredential,
  EnvironmentCredential,
  AzureCliCredential,
  AzurePowerShellCredential,
  TokenCredential,
} from "@azure/identity";
import { AdditionalPolicyConfig } from "@azure/core-client";

import { Logger } from "./logging";
import { DeployConfig } from "./config";

const userAgentPrefix = "gh-azure-bicep-deploy";
const dummySubscriptionId = "00000000-0000-0000-0000-000000000000";
const endpoints = {
  azureCloud: "https://management.azure.com",
  azureChinaCloud: "https://management.chinacloudapi.cn",
  azureGermanCloud: "https://management.microsoftazure.de",
  azureUSGovernment: "https://management.usgovcloudapi.net",
};

export function createDeploymentClient(
  config: DeployConfig,
  logger: Logger,
  subscriptionId?: string,
  tenantId?: string,
): ResourceManagementClient {
  return new ResourceManagementClient(
    getCredential(tenantId),
    // Use a dummy subscription ID for above-subscription scope operations
    subscriptionId ?? dummySubscriptionId,
    {
      userAgentOptions: {
        userAgentPrefix: userAgentPrefix,
      },
      additionalPolicies: [createDebugLoggingPolicy(logger)],
      // Use a recent API version to take advantage of error improvements
      apiVersion: "2024-03-01",
      endpoint: endpoints[config.environment],
    },
  );
}

export function createStacksClient(
  config: DeployConfig,
  logger: Logger,
  subscriptionId?: string,
  tenantId?: string,
): DeploymentStacksClient {
  return new DeploymentStacksClient(
    getCredential(tenantId),
    // Use a dummy subscription ID for above-subscription scope operations
    subscriptionId ?? dummySubscriptionId,
    {
      userAgentOptions: {
        userAgentPrefix: userAgentPrefix,
      },
      additionalPolicies: [createDebugLoggingPolicy(logger)],
      endpoint: endpoints[config.environment],
    },
  );
}

// Log Azure SDK request and response details when debug logging is enabled.
export function createDebugLoggingPolicy(
  logger: Logger,
): AdditionalPolicyConfig {
  return {
    position: "perCall",
    policy: {
      name: "debugLoggingPolicy",
      async sendRequest(request, next) {
        if (logger.isDebugEnabled()) {
          logger.logExternalOutput(
            `Request: ${request.method} ${request.url}`,
            { source: "repository", level: "debug" },
          );
          if (request.body) {
            const parsed = JSON.parse(request.body.toString());
            logger.logExternalOutput(
              `Body: ${JSON.stringify(parsed, null, 2)}`,
              {
                source: "repository",
                level: "debug",
              },
            );
          }
        }

        const response = await next(request);

        if (logger.isDebugEnabled()) {
          logger.logExternalOutput(`Response: ${response.status}`, {
            source: "remote",
            level: "debug",
          });
          if (response.bodyAsText) {
            const parsed = JSON.parse(response.bodyAsText);
            logger.logExternalOutput(
              `Body: ${JSON.stringify(parsed, null, 2)}`,
              {
                source: "remote",
                level: "debug",
              },
            );
          }

          const correlationId = response.headers.get(
            "x-ms-correlation-request-id",
          );
          logger.logExternalOutput(`CorrelationId: ${correlationId}`, {
            source: "remote",
            level: "debug",
          });

          const activityId = response.headers.get("x-ms-request-id");
          logger.logExternalOutput(`ActivityId: ${activityId}`, {
            source: "remote",
            level: "debug",
          });
        }

        return response;
      },
    },
  };
}

function getCredential(tenantId?: string): TokenCredential {
  return new ChainedTokenCredential(
    new EnvironmentCredential(),
    new AzureCliCredential({ tenantId }),
    new AzurePowerShellCredential({ tenantId }),
  );
}
