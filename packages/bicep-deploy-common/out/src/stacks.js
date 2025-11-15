"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stackCreate = stackCreate;
exports.stackValidate = stackValidate;
exports.stackDelete = stackDelete;
exports.getStack = getStack;
exports.getStackDeletionOptions = getStackDeletionOptions;
const utils_1 = require("./utils");
async function stackCreate(config, files, logger) {
    const name = config.name ?? utils_1.defaultName;
    const scope = config.scope;
    const client = (0, utils_1.getStacksClient)(config, scope, logger);
    const stack = getStack(config, files);
    switch (scope.type) {
        case "resourceGroup":
            return await client.deploymentStacks.beginCreateOrUpdateAtResourceGroupAndWait(scope.resourceGroup, name, stack, (0, utils_1.getCreateOperationOptions)());
        case "subscription":
            return await client.deploymentStacks.beginCreateOrUpdateAtSubscriptionAndWait(name, {
                ...stack,
                location: (0, utils_1.requireLocation)(config),
            }, (0, utils_1.getCreateOperationOptions)());
        case "managementGroup":
            return await client.deploymentStacks.beginCreateOrUpdateAtManagementGroupAndWait(scope.managementGroup, name, {
                ...stack,
                location: (0, utils_1.requireLocation)(config),
            }, (0, utils_1.getCreateOperationOptions)());
    }
}
async function stackValidate(config, files, logger) {
    const name = config.name ?? utils_1.defaultName;
    const scope = config.scope;
    const client = (0, utils_1.getStacksClient)(config, scope, logger);
    const stack = getStack(config, files);
    switch (scope.type) {
        case "resourceGroup":
            return await client.deploymentStacks.beginValidateStackAtResourceGroupAndWait(scope.resourceGroup, name, stack);
        case "subscription":
            return await client.deploymentStacks.beginValidateStackAtSubscriptionAndWait(name, {
                ...stack,
                location: (0, utils_1.requireLocation)(config),
            });
        case "managementGroup":
            return await client.deploymentStacks.beginValidateStackAtManagementGroupAndWait(scope.managementGroup, name, {
                ...stack,
                location: (0, utils_1.requireLocation)(config),
            });
    }
}
async function stackDelete(config, logger) {
    const name = config.name ?? utils_1.defaultName;
    const scope = config.scope;
    const client = (0, utils_1.getStacksClient)(config, scope, logger);
    const deletionOptions = getStackDeletionOptions(config);
    switch (scope.type) {
        case "resourceGroup":
            return await client.deploymentStacks.beginDeleteAtResourceGroupAndWait(scope.resourceGroup, name, deletionOptions);
        case "subscription":
            return await client.deploymentStacks.beginDeleteAtSubscriptionAndWait(name, deletionOptions);
        case "managementGroup":
            return await client.deploymentStacks.beginDeleteAtManagementGroupAndWait(scope.managementGroup, name, deletionOptions);
    }
}
function getStack(config, files) {
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
function getStackDeletionOptions(config) {
    return {
        unmanageActionResources: config.actionOnUnManage.resources,
        unmanageActionResourceGroups: config.actionOnUnManage.resourceGroups,
        unmanageActionManagementGroups: config.actionOnUnManage.managementGroups,
        bypassStackOutOfSyncError: config.bypassStackOutOfSyncError,
    };
}
//# sourceMappingURL=stacks.js.map