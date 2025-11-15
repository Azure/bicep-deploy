"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfig = parseConfig;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const input_1 = require("./input");
function parseConfig(inputReader) {
    const type = (0, input_1.getRequiredEnumInput)("type", ["deployment", "deploymentStack"], inputReader);
    const name = (0, input_1.getOptionalStringInput)("name", inputReader);
    const location = (0, input_1.getOptionalStringInput)("location", inputReader);
    const templateFile = (0, input_1.getOptionalFilePath)("template-file", inputReader);
    const parametersFile = (0, input_1.getOptionalFilePath)("parameters-file", inputReader);
    const parameters = (0, input_1.getOptionalDictionaryInput)("parameters", inputReader);
    const bicepVersion = (0, input_1.getOptionalStringInput)("bicep-version", inputReader);
    const description = (0, input_1.getOptionalStringInput)("description", inputReader);
    const tags = (0, input_1.getOptionalStringDictionaryInput)("tags", inputReader);
    const maskedOutputs = (0, input_1.getOptionalStringArrayInput)("masked-outputs", inputReader);
    const environment = (0, input_1.getOptionalEnumInput)("environment", [
        "azureCloud",
        "azureChinaCloud",
        "azureGermanCloud",
        "azureUSGovernment",
    ], inputReader) ?? "azureCloud";
    switch (type) {
        case "deployment": {
            return {
                type,
                name,
                location,
                templateFile,
                parametersFile,
                parameters,
                bicepVersion,
                tags,
                maskedOutputs,
                environment: environment,
                operation: (0, input_1.getRequiredEnumInput)("operation", ["create", "validate", "whatIf"], inputReader),
                scope: parseDeploymentScope(inputReader),
                whatIf: {
                    excludeChangeTypes: (0, input_1.getOptionalEnumArrayInput)("what-if-exclude-change-types", [
                        "create",
                        "delete",
                        "modify",
                        "deploy",
                        "noChange",
                        "ignore",
                        "unsupported",
                    ], inputReader),
                },
                validationLevel: (0, input_1.getOptionalEnumInput)("validation-level", ["provider", "template", "providerNoRbac"], inputReader),
            };
        }
        case "deploymentStack": {
            return {
                type,
                name,
                location,
                templateFile,
                parametersFile,
                parameters,
                bicepVersion,
                description,
                tags,
                maskedOutputs,
                environment: environment,
                operation: (0, input_1.getRequiredEnumInput)("operation", ["create", "validate", "delete"], inputReader),
                scope: parseDeploymentStackScope(inputReader),
                actionOnUnManage: {
                    resources: (0, input_1.getRequiredEnumInput)("action-on-unmanage-resources", ["delete", "detach"], inputReader),
                    resourceGroups: (0, input_1.getOptionalEnumInput)("action-on-unmanage-resourcegroups", ["delete", "detach"], inputReader),
                    managementGroups: (0, input_1.getOptionalEnumInput)("action-on-unmanage-managementgroups", ["delete", "detach"], inputReader),
                },
                bypassStackOutOfSyncError: (0, input_1.getOptionalBooleanInput)("bypass-stack-out-of-sync-error", inputReader),
                denySettings: {
                    mode: (0, input_1.getRequiredEnumInput)("deny-settings-mode", ["denyDelete", "denyWriteAndDelete", "none"], inputReader),
                    excludedActions: (0, input_1.getOptionalStringArrayInput)("deny-settings-excluded-actions", inputReader),
                    excludedPrincipals: (0, input_1.getOptionalStringArrayInput)("deny-settings-excluded-principals", inputReader),
                    applyToChildScopes: (0, input_1.getOptionalBooleanInput)("deny-settings-apply-to-child-scopes", inputReader),
                },
            };
        }
    }
}
function parseDeploymentScope(inputReader) {
    const type = (0, input_1.getRequiredEnumInput)("scope", ["tenant", "managementGroup", "subscription", "resourceGroup"], inputReader);
    const tenantId = (0, input_1.getOptionalStringInput)("tenant-id", inputReader);
    switch (type) {
        case "tenant": {
            return {
                type,
                tenantId,
            };
        }
        case "managementGroup": {
            const managementGroup = (0, input_1.getRequiredStringInput)("management-group-id", inputReader);
            return {
                type,
                tenantId,
                managementGroup,
            };
        }
        case "subscription": {
            const subscriptionId = (0, input_1.getRequiredStringInput)("subscription-id", inputReader);
            return {
                type,
                tenantId,
                subscriptionId,
            };
        }
        case "resourceGroup": {
            const subscriptionId = (0, input_1.getRequiredStringInput)("subscription-id", inputReader);
            const resourceGroup = (0, input_1.getRequiredStringInput)("resource-group-name", inputReader);
            return {
                type,
                tenantId,
                subscriptionId,
                resourceGroup,
            };
        }
    }
}
function parseDeploymentStackScope(inputReader) {
    const type = (0, input_1.getRequiredEnumInput)("scope", ["managementGroup", "subscription", "resourceGroup"], inputReader);
    const tenantId = (0, input_1.getOptionalStringInput)("tenant-id", inputReader);
    switch (type) {
        case "managementGroup": {
            const managementGroup = (0, input_1.getRequiredStringInput)("management-group-id", inputReader);
            return {
                type,
                tenantId,
                managementGroup,
            };
        }
        case "subscription": {
            const subscriptionId = (0, input_1.getRequiredStringInput)("subscription-id", inputReader);
            return {
                type,
                tenantId,
                subscriptionId,
            };
        }
        case "resourceGroup": {
            const subscriptionId = (0, input_1.getRequiredStringInput)("subscription-id", inputReader);
            const resourceGroup = (0, input_1.getRequiredStringInput)("resource-group-name", inputReader);
            return {
                type,
                tenantId,
                subscriptionId,
                resourceGroup,
            };
        }
    }
}
//# sourceMappingURL=config.js.map