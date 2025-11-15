"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeploymentClient = createDeploymentClient;
exports.createStacksClient = createStacksClient;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const arm_resources_1 = require("@azure/arm-resources");
const arm_resourcesdeploymentstacks_1 = require("@azure/arm-resourcesdeploymentstacks");
const identity_1 = require("@azure/identity");
const userAgentPrefix = "gh-azure-bicep-deploy";
const dummySubscriptionId = "00000000-0000-0000-0000-000000000000";
const endpoints = {
    azureCloud: "https://management.azure.com",
    azureChinaCloud: "https://management.chinacloudapi.cn",
    azureGermanCloud: "https://management.microsoftazure.de",
    azureUSGovernment: "https://management.usgovcloudapi.net",
};
function createDeploymentClient(config, logger, subscriptionId, tenantId) {
    return new arm_resources_1.ResourceManagementClient(getCredential(tenantId), 
    // Use a dummy subscription ID for above-subscription scope operations
    subscriptionId ?? dummySubscriptionId, {
        userAgentOptions: {
            userAgentPrefix: userAgentPrefix,
        },
        additionalPolicies: [createDebugLoggingPolicy(logger)],
        // Use a recent API version to take advantage of error improvements
        apiVersion: "2024-03-01",
        endpoint: endpoints[config.environment],
    });
}
function createStacksClient(config, logger, subscriptionId, tenantId) {
    return new arm_resourcesdeploymentstacks_1.DeploymentStacksClient(getCredential(tenantId), 
    // Use a dummy subscription ID for above-subscription scope operations
    subscriptionId ?? dummySubscriptionId, {
        userAgentOptions: {
            userAgentPrefix: userAgentPrefix,
        },
        additionalPolicies: [createDebugLoggingPolicy(logger)],
        endpoint: endpoints[config.environment],
    });
}
// Log request + response bodies to GitHub Actions debug output if enabled
function createDebugLoggingPolicy(logger) {
    return {
        position: "perCall",
        policy: {
            name: "debugLoggingPolicy",
            async sendRequest(request, next) {
                if (logger.isDebugEnabled()) {
                    logger.debug(`Request: ${request.method} ${request.url}`);
                    if (request.body) {
                        const parsed = JSON.parse(request.body.toString());
                        logger.debug(`Body: ${JSON.stringify(parsed, null, 2)}`);
                    }
                }
                const response = await next(request);
                if (logger.isDebugEnabled()) {
                    logger.debug(`Response: ${response.status}`);
                    if (response.bodyAsText) {
                        const parsed = JSON.parse(response.bodyAsText);
                        logger.debug(`Body: ${JSON.stringify(parsed, null, 2)}`);
                    }
                    const correlationId = response.headers.get("x-ms-correlation-request-id");
                    logger.debug(`CorrelationId: ${correlationId}`);
                    const activityId = response.headers.get("x-ms-request-id");
                    logger.debug(`ActivityId: ${activityId}`);
                }
                return response;
            },
        },
    };
}
function getCredential(tenantId) {
    return new identity_1.ChainedTokenCredential(new identity_1.EnvironmentCredential(), new identity_1.AzureCliCredential({ tenantId }), new identity_1.AzurePowerShellCredential({ tenantId }));
}
//# sourceMappingURL=azure.js.map