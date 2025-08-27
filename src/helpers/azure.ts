// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeploymentsClient } from "@azure/arm-resourcesdeployments";
import { DeploymentStacksClient } from "@azure/arm-resourcesdeploymentstacks";
import {
  ChainedTokenCredential,
  EnvironmentCredential,
  AzureCliCredential,
  AzurePowerShellCredential,
  TokenCredential,
} from "@azure/identity";
import { AdditionalPolicyConfig } from "@azure/core-client";
import { debug, isDebug } from "@actions/core";

import { ActionConfig } from "../config";

const userAgentPrefix = "gh-azure-bicep-deploy";
const dummySubscriptionId = "00000000-0000-0000-0000-000000000000";
const endpoints = {
  azureCloud: "https://management.azure.com",
  azureChinaCloud: "https://management.chinacloudapi.cn",
  azureGermanCloud: "https://management.microsoftazure.de",
  azureUSGovernment: "https://management.usgovcloudapi.net",
};

export function createDeploymentClient(
  config: ActionConfig,
  subscriptionId?: string,
  tenantId?: string,
): DeploymentsClient {
  return new DeploymentsClient(
    getCredential(tenantId),
    // Use a dummy subscription ID for above-subscription scope operations
    subscriptionId ?? dummySubscriptionId,
    {
      userAgentOptions: {
        userAgentPrefix: userAgentPrefix,
      },
      additionalPolicies: [debugLoggingPolicy],
      // Use a recent API version to take advantage of error improvements
      apiVersion: "2024-03-01",
      endpoint: endpoints[config.environment],
    },
  );
}

export function createStacksClient(
  config: ActionConfig,
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
      additionalPolicies: [debugLoggingPolicy],
      endpoint: endpoints[config.environment],
    },
  );
}

// Log request + response bodies to GitHub Actions debug output if enabled
const debugLoggingPolicy: AdditionalPolicyConfig = {
  position: "perCall",
  policy: {
    name: "debugLoggingPolicy",
    async sendRequest(request, next) {
      if (isDebug()) {
        debug(`Request: ${request.method} ${request.url}`);
        if (request.body) {
          const parsed = JSON.parse(request.body.toString());
          debug(`Body: ${JSON.stringify(parsed, null, 2)}`);
        }
      }

      const response = await next(request);

      if (isDebug()) {
        debug(`Response: ${response.status}`);
        if (response.bodyAsText) {
          const parsed = JSON.parse(response.bodyAsText);
          debug(`Body: ${JSON.stringify(parsed, null, 2)}`);
        }

        const correlationId = response.headers.get(
          "x-ms-correlation-request-id",
        );
        debug(`CorrelationId: ${correlationId}`);

        const activityId = response.headers.get("x-ms-request-id");
        debug(`ActivityId: ${activityId}`);
      }

      return response;
    },
  },
};

function getCredential(tenantId?: string): TokenCredential {
  return new ChainedTokenCredential(
    new EnvironmentCredential(),
    new AzureCliCredential({ tenantId }),
    new AzurePowerShellCredential({ tenantId }),
  );
}
