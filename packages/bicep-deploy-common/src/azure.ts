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
import type { HttpClient, PipelineRequest } from "@azure/core-rest-pipeline";

import { Logger } from "./logging";
import {
  DeployConfig,
  ManagementGroupScope,
  ResourceGroupScope,
  SubscriptionScope,
  TenantScope,
} from "./config";

const userAgentPrefix = "gh-azure-bicep-deploy";
const dummySubscriptionId = "00000000-0000-0000-0000-000000000000";
const endpoints = {
  azureCloud: "https://management.azure.com",
  azureChinaCloud: "https://management.chinacloudapi.cn",
  azureGermanCloud: "https://management.microsoftazure.de",
  azureUSGovernment: "https://management.usgovcloudapi.net",
};

// Matches Azure PowerShell's initial wait before it first polls a new deployment.
export const initialCreateStatusPollDelayMs = 5_000;
export const deploymentInitialPollDelayPolicyName =
  "deploymentInitialPollDelayPolicy";

const deploymentOperationStatusPathPattern =
  /\/providers\/microsoft\.resources\/deployments\/[^/]+\/operationstatuses\/[^/]+\/?$/i;

export interface DeploymentClientOptions {
  delayInitialCreateStatusPoll?: boolean;
  // Test-only overrides; never set in production paths.
  httpClient?: HttpClient;
  credential?: TokenCredential;
}

export function createDeploymentClient(
  config: DeployConfig,
  logger: Logger,
  subscriptionId?: string,
  tenantId?: string,
  options: DeploymentClientOptions = {},
): ResourceManagementClient {
  const additionalPolicies: AdditionalPolicyConfig[] = [];
  if (options.delayInitialCreateStatusPoll) {
    additionalPolicies.push(createDeploymentInitialPollDelayPolicy());
  }
  additionalPolicies.push(createDebugLoggingPolicy(logger));

  return new ResourceManagementClient(
    options.credential ?? getCredential(tenantId),
    // Use a dummy subscription ID for above-subscription scope operations
    subscriptionId ?? dummySubscriptionId,
    {
      userAgentOptions: {
        userAgentPrefix: userAgentPrefix,
      },
      additionalPolicies,
      // Use a recent API version to take advantage of error improvements
      apiVersion: "2024-03-01",
      endpoint: endpoints[config.environment],
      httpClient: options.httpClient,
    },
  );
}

// Each call must create a new client: the delay policy delays only the first
// operation-status poll it sees, so a client must serve exactly one create.
export function getDeploymentCreateClient(
  config: DeployConfig,
  scope:
    | TenantScope
    | ManagementGroupScope
    | SubscriptionScope
    | ResourceGroupScope,
  logger: Logger,
  options: Omit<DeploymentClientOptions, "delayInitialCreateStatusPoll"> = {},
): ResourceManagementClient {
  const { tenantId } = scope;
  const subscriptionId =
    "subscriptionId" in scope ? scope.subscriptionId : undefined;

  return createDeploymentClient(config, logger, subscriptionId, tenantId, {
    ...options,
    delayInitialCreateStatusPoll: true,
  });
}

export function isDeploymentOperationStatusRequest(
  request: Pick<PipelineRequest, "method" | "url">,
): boolean {
  if (request.method.toUpperCase() !== "GET") {
    return false;
  }

  let pathname: string;
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    return false;
  }

  return deploymentOperationStatusPathPattern.test(pathname);
}

// Waits before the first deployment operation-status poll so ARM can make the
// new deployment visible. It never inspects responses or retries requests.
export function createDeploymentInitialPollDelayPolicy(
  delayMs: number = initialCreateStatusPollDelayMs,
): AdditionalPolicyConfig {
  let initialStatusPollDelayed = false;

  return {
    position: "perCall",
    policy: {
      name: deploymentInitialPollDelayPolicyName,
      async sendRequest(request, next) {
        if (
          !initialStatusPollDelayed &&
          isDeploymentOperationStatusRequest(request)
        ) {
          initialStatusPollDelayed = true;
          await abortableDelay(delayMs, request.abortSignal);
        }

        return await next(request);
      },
    },
  };
}

function abortableDelay(
  delayMs: number,
  abortSignal: PipelineRequest["abortSignal"],
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(createAbortError());
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      abortSignal?.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };

    const timer = setTimeout(() => {
      abortSignal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);

    abortSignal?.addEventListener("abort", onAbort);
  });
}

function createAbortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
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
