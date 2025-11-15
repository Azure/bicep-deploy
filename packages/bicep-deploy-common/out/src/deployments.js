"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploymentCreate = deploymentCreate;
exports.deploymentValidate = deploymentValidate;
exports.deploymentWhatIf = deploymentWhatIf;
exports.getDeployment = getDeployment;
const utils_1 = require("./utils");
async function deploymentCreate(config, files, logger) {
    const name = config.name ?? utils_1.defaultName;
    const scope = config.scope;
    const client = (0, utils_1.getDeploymentClient)(config, scope, logger);
    const deployment = getDeployment(config, files);
    switch (scope.type) {
        case "resourceGroup":
            return await client.deployments.beginCreateOrUpdateAndWait(scope.resourceGroup, name, deployment, (0, utils_1.getCreateOperationOptions)());
        case "subscription":
            return await client.deployments.beginCreateOrUpdateAtSubscriptionScopeAndWait(name, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            }, (0, utils_1.getCreateOperationOptions)());
        case "managementGroup":
            return await client.deployments.beginCreateOrUpdateAtManagementGroupScopeAndWait(scope.managementGroup, name, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            }, (0, utils_1.getCreateOperationOptions)());
        case "tenant":
            return await client.deployments.beginCreateOrUpdateAtTenantScopeAndWait(name, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            }, (0, utils_1.getCreateOperationOptions)());
    }
}
async function deploymentValidate(config, files, logger) {
    const name = config.name ?? utils_1.defaultName;
    const scope = config.scope;
    const client = (0, utils_1.getDeploymentClient)(config, scope, logger);
    const deployment = getDeployment(config, files);
    switch (scope.type) {
        case "resourceGroup":
            return await client.deployments.beginValidateAndWait(scope.resourceGroup, name, deployment);
        case "subscription":
            return await client.deployments.beginValidateAtSubscriptionScopeAndWait(name, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            });
        case "managementGroup":
            return await client.deployments.beginValidateAtManagementGroupScopeAndWait(scope.managementGroup, name, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            });
        case "tenant":
            await client.deployments.beginValidateAtTenantScopeAndWait(name, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            });
    }
}
async function deploymentWhatIf(config, files, logger) {
    const deploymentName = config.name ?? utils_1.defaultName;
    const scope = config.scope;
    const client = (0, utils_1.getDeploymentClient)(config, scope, logger);
    const deployment = getDeployment(config, files);
    switch (scope.type) {
        case "resourceGroup":
            return await client.deployments.beginWhatIfAndWait(scope.resourceGroup, deploymentName, deployment);
        case "subscription":
            return await client.deployments.beginWhatIfAtSubscriptionScopeAndWait(deploymentName, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            });
        case "managementGroup":
            return await client.deployments.beginWhatIfAtManagementGroupScopeAndWait(scope.managementGroup, deploymentName, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            });
        case "tenant":
            return await client.deployments.beginWhatIfAtTenantScopeAndWait(deploymentName, {
                ...deployment,
                location: (0, utils_1.requireLocation)(config),
            });
    }
}
function getDeployment(config, files) {
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
//# sourceMappingURL=deployments.js.map