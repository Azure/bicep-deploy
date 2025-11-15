"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomPollingError = exports.defaultName = void 0;
exports.getDeploymentClient = getDeploymentClient;
exports.getStacksClient = getStacksClient;
exports.getCreateOperationOptions = getCreateOperationOptions;
exports.requireLocation = requireLocation;
exports.logDiagnostics = logDiagnostics;
exports.validateFileScope = validateFileScope;
exports.tryWithErrorHandling = tryWithErrorHandling;
const azure_1 = require("./azure");
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
exports.defaultName = "azure-bicep-deploy";
function getDeploymentClient(config, scope, logger) {
    const { tenantId } = scope;
    const subscriptionId = "subscriptionId" in scope ? scope.subscriptionId : undefined;
    return (0, azure_1.createDeploymentClient)(config, logger, subscriptionId, tenantId);
}
function getStacksClient(config, scope, logger) {
    const { tenantId } = scope;
    const subscriptionId = "subscriptionId" in scope ? scope.subscriptionId : undefined;
    return (0, azure_1.createStacksClient)(config, logger, subscriptionId, tenantId);
}
// workaround until we're able to pick up https://github.com/Azure/azure-sdk-for-js/pull/25500
function getCreateOperationOptions() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onResponse: (rawResponse, flatResponse) => {
            if (flatResponse &&
                flatResponse.error &&
                flatResponse.error.code &&
                flatResponse.error.message) {
                throw new CustomPollingError(flatResponse, rawResponse);
            }
        },
    };
}
// workaround until we're able to pick up https://github.com/Azure/azure-sdk-for-js/pull/25500
class CustomPollingError {
    constructor(details, response) {
        this.details = details;
        this.response = response;
    }
}
exports.CustomPollingError = CustomPollingError;
function requireLocation(config) {
    // this just exists to make typescript's validation happy.
    // it should only be called in places where we've already validated the location is set.
    if (!config.location) {
        throw new Error("Location is required");
    }
    return config.location;
}
function logDiagnostics(diagnostics, logger) {
    if (diagnostics.length === 0) {
        return;
    }
    logger.logInfo("Diagnostics returned by the API");
    for (const diagnostic of diagnostics) {
        const message = `[${diagnostic.level}] ${diagnostic.code}: ${diagnostic.message}`;
        switch (diagnostic.level.toLowerCase()) {
            case "error":
                logger.logError(message);
                break;
            case "warning":
                logger.logWarning(message);
                break;
            default:
                logger.logInfo(message);
                break;
        }
    }
}
function validateFileScope(config, files) {
    const scope = getScope(files);
    if (!scope) {
        return;
    }
    if (scope !== config.scope.type) {
        throw new Error(`The target scope ${scope} does not match the deployment scope ${config.scope.type}.`);
    }
}
function getScope(files) {
    const template = files.templateContents ?? {};
    const bicepGenerated = template.metadata?._generator?.name;
    const schema = template["$schema"];
    if (!bicepGenerated) {
        // loose validation for non-Bicep generated templates, to match Azure CLI behavior
        return;
    }
    const result = /https:\/\/schema\.management\.azure\.com\/schemas\/[0-9a-zA-Z-]+\/([a-zA-Z]+)Template\.json#?/.exec(schema);
    const scopeMatch = result ? result[1].toLowerCase() : null;
    switch (scopeMatch) {
        case "tenantdeployment":
            return "tenant";
        case "managementgroupdeployment":
            return "managementGroup";
        case "subscriptiondeployment":
            return "subscription";
        case "deployment":
            return "resourceGroup";
        default:
            throw new Error(`Failed to determine deployment scope from Bicep file.`);
    }
}
async function tryWithErrorHandling(action, onError, logger) {
    try {
        return await action();
    }
    catch (ex) {
        if (ex instanceof core_rest_pipeline_1.RestError) {
            const correlationId = ex.response?.headers.get("x-ms-correlation-request-id");
            logger.logError(`Request failed. CorrelationId: ${correlationId}`);
            const { error } = ex.details;
            if (error) {
                onError(error);
                return;
            }
        }
        if (ex instanceof CustomPollingError) {
            const correlationId = ex.response?.headers.get("x-ms-correlation-request-id");
            logger.logError(`Request failed. CorrelationId: ${correlationId}`);
            const { error } = ex.details;
            if (error) {
                onError(error);
                return;
            }
        }
        throw ex;
    }
}
//# sourceMappingURL=utils.js.map