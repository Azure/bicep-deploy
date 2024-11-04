// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ResourceManagementClient } from "@azure/arm-resources";
import { DeploymentStacksClient } from "@azure/arm-resourcesdeploymentstacks";
import { DefaultAzureCredential } from "@azure/identity";
import { AdditionalPolicyConfig } from "@azure/core-client";
import { debug, isDebug } from "@actions/core";

const userAgentPrefix = "gh-azure-bicep-deploy";
const dummySubscriptionId = "00000000-0000-0000-0000-000000000000";

export function createDeploymentClient(
  subscriptionId?: string,
  tenantId?: string,
): ResourceManagementClient {
  const credentials = new DefaultAzureCredential({ tenantId });

  return new ResourceManagementClient(
    credentials,
    // Use a dummy subscription ID for above-subscription scope operations
    subscriptionId ?? dummySubscriptionId,
    {
      userAgentOptions: {
        userAgentPrefix: userAgentPrefix,
      },
      additionalPolicies: [debugLoggingPolicy],
      // Use a recent API version to take advantage of error improvements
      apiVersion: "2024-03-01",
    },
  );
}

export function createStacksClient(
  subscriptionId?: string,
  tenantId?: string,
): DeploymentStacksClient {
  const credentials = new DefaultAzureCredential({ tenantId });

  return new DeploymentStacksClient(
    credentials,
    // Use a dummy subscription ID for above-subscription scope operations
    subscriptionId ?? dummySubscriptionId,
    {
      userAgentOptions: {
        userAgentPrefix: userAgentPrefix,
      },
      additionalPolicies: [debugLoggingPolicy],
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
