"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const outputMocks_1 = require("./mocks/outputMocks");
const azureMocks_1 = require("./mocks/azureMocks");
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const logging_1 = require("./logging");
const handler_1 = require("../src/handler");
const utils_1 = require("./utils");
const outputSetter = new outputMocks_1.mockOutputSetter();
describe("deployment execution", () => {
    afterEach(() => jest.clearAllMocks());
    describe("subscription scope", () => {
        const scope = {
            type: "subscription",
            subscriptionId: "mockSub",
        };
        const config = {
            location: "mockLocation",
            type: "deployment",
            scope: scope,
            name: "mockName",
            operation: "create",
            tags: { foo: "bar" },
            whatIf: {
                excludeChangeTypes: ["noChange"],
            },
            environment: "azureCloud",
            validationLevel: "providerNoRbac",
        };
        const files = {
            templateContents: JSON.parse((0, utils_1.readTestFile)("files/basic-sub/main.json")),
            parametersContents: JSON.parse((0, utils_1.readTestFile)("files/basic-sub/main.parameters.json")),
        };
        const logger = new logging_1.TestLogger();
        const expectedProperties = {
            mode: "Incremental",
            template: files.templateContents,
            parameters: files.parametersContents["parameters"],
            expressionEvaluationOptions: {
                scope: "inner",
            },
            validationLevel: "providerNoRbac",
        };
        const expectedPayload = {
            location: config.location,
            properties: expectedProperties,
            tags: config.tags,
        };
        const mockReturnPayload = {
            ...expectedPayload,
            properties: {
                ...expectedProperties,
                outputs: { mockOutput: { value: "foo" } },
            },
        };
        it("deploys", async () => {
            azureMocks_1.mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait.mockResolvedValue(mockReturnPayload);
            await (0, handler_1.execute)(config, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createDeploymentClient).toHaveBeenCalledWith(config, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait).toHaveBeenCalledWith(config.name, expectedPayload, expect.anything());
            expect(outputSetter.setOutput).toHaveBeenCalledWith("mockOutput", "foo");
            expect(outputSetter.setSecret).not.toHaveBeenCalled();
        });
        it("masks secure values", async () => {
            azureMocks_1.mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait.mockResolvedValue(mockReturnPayload);
            await (0, handler_1.execute)({ ...config, maskedOutputs: ["mockOutput"] }, files, logger, outputSetter);
            expect(outputSetter.setSecret).toHaveBeenCalledWith("foo");
        });
        it("validates", async () => {
            await (0, handler_1.execute)({ ...config, operation: "validate" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createDeploymentClient).toHaveBeenCalledWith({ ...config, operation: "validate" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockDeploymentsOps.beginValidateAtSubscriptionScopeAndWait).toHaveBeenCalledWith(config.name, expectedPayload);
        });
        it("what-ifs", async () => {
            azureMocks_1.mockDeploymentsOps.beginWhatIfAtSubscriptionScopeAndWait.mockResolvedValue({});
            await (0, handler_1.execute)({ ...config, operation: "whatIf" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createDeploymentClient).toHaveBeenCalledWith({ ...config, operation: "whatIf" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockDeploymentsOps.beginWhatIfAtSubscriptionScopeAndWait).toHaveBeenCalledWith(config.name, expectedPayload);
        });
    });
    describe("resource group scope", () => {
        const scope = {
            type: "resourceGroup",
            subscriptionId: "mockSub",
            resourceGroup: "mockRg",
        };
        const config = {
            type: "deployment",
            scope: scope,
            name: "mockName",
            operation: "create",
            tags: { foo: "bar" },
            whatIf: {
                excludeChangeTypes: ["noChange"],
            },
            environment: "azureCloud",
            validationLevel: "providerNoRbac",
        };
        const files = {
            templateContents: JSON.parse((0, utils_1.readTestFile)("files/basic/main.json")),
            parametersContents: JSON.parse((0, utils_1.readTestFile)("files/basic/main.parameters.json")),
        };
        const logger = new logging_1.TestLogger();
        const expectedProperties = {
            mode: "Incremental",
            template: files.templateContents,
            parameters: files.parametersContents["parameters"],
            expressionEvaluationOptions: {
                scope: "inner",
            },
            validationLevel: "providerNoRbac",
        };
        const expectedPayload = {
            properties: expectedProperties,
            tags: config.tags,
        };
        const mockReturnPayload = {
            ...expectedPayload,
            properties: {
                ...expectedProperties,
                outputs: { mockOutput: { value: "foo" } },
            },
        };
        const mockError = {
            code: "InvalidTemplateDeployment",
            message: "The template deployment 'azure-bicep-deploy' is not valid according to the validation procedure. The tracking id is '06d4fb15-ecb0-4682-a6d9-1bf416ca0722'. See inner errors for details.",
            details: [
                {
                    code: "PreflightValidationCheckFailed",
                    message: "Preflight validation failed. Please refer to the details for the specific errors.",
                    details: [
                        {
                            code: "StorageAccountAlreadyTaken",
                            message: "The storage account named foo is already taken.",
                            target: "foo",
                        },
                    ],
                },
            ],
        };
        it("deploys", async () => {
            azureMocks_1.mockDeploymentsOps.beginCreateOrUpdateAndWait.mockResolvedValue(mockReturnPayload);
            await (0, handler_1.execute)(config, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createDeploymentClient).toHaveBeenCalledWith(config, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockDeploymentsOps.beginCreateOrUpdateAndWait).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload, expect.anything());
            expect(outputSetter.setOutput).toHaveBeenCalledWith("mockOutput", "foo");
            expect(outputSetter.setSecret).not.toHaveBeenCalled();
        });
        it("masks secure values", async () => {
            azureMocks_1.mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait.mockResolvedValue(mockReturnPayload);
            await (0, handler_1.execute)({ ...config, maskedOutputs: ["mockOutput"] }, files, logger, outputSetter);
            expect(outputSetter.setSecret).toHaveBeenCalledWith("foo");
        });
        it("handles deploy errors", async () => {
            azureMocks_1.mockDeploymentsOps.beginCreateOrUpdateAndWait.mockRejectedValue(getMockRestError(mockError));
            const spyLogError = jest.spyOn(logger, "logError");
            await (0, handler_1.execute)({ ...config, operation: "create" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createDeploymentClient).toHaveBeenCalledWith({ ...config, operation: "create" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockDeploymentsOps.beginCreateOrUpdateAndWait).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload, expect.anything());
            expect(spyLogError).toHaveBeenNthCalledWith(1, expect.stringContaining('Request failed. CorrelationId: '));
            expect(spyLogError).toHaveBeenNthCalledWith(2, JSON.stringify(mockError, null, 2));
        });
        it("validates", async () => {
            await (0, handler_1.execute)({ ...config, operation: "validate" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createDeploymentClient).toHaveBeenCalledWith({ ...config, operation: "validate" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockDeploymentsOps.beginValidateAndWait).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);
        });
        it("handles validate errors", async () => {
            azureMocks_1.mockDeploymentsOps.beginValidateAndWait.mockRejectedValue(getMockRestError(mockError));
            const spyLogError = jest.spyOn(logger, "logError");
            await (0, handler_1.execute)({ ...config, operation: "validate" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createDeploymentClient).toHaveBeenCalledWith({ ...config, operation: "validate" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockDeploymentsOps.beginValidateAndWait).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);
            expect(spyLogError).toHaveBeenNthCalledWith(1, expect.stringContaining('Request failed. CorrelationId: '));
            expect(spyLogError).toHaveBeenNthCalledWith(2, JSON.stringify(mockError, null, 2));
        });
        it("what-ifs", async () => {
            azureMocks_1.mockDeploymentsOps.beginWhatIfAndWait.mockResolvedValue({});
            await (0, handler_1.execute)({ ...config, operation: "whatIf" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createDeploymentClient).toHaveBeenCalledWith({ ...config, operation: "whatIf" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockDeploymentsOps.beginWhatIfAndWait).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);
        });
    });
});
describe("stack execution", () => {
    afterEach(() => jest.clearAllMocks());
    describe("subscription scope", () => {
        const scope = {
            type: "subscription",
            subscriptionId: "mockSub",
        };
        const config = {
            location: "mockLocation",
            type: "deploymentStack",
            scope: scope,
            name: "mockName",
            operation: "create",
            tags: { foo: "bar" },
            denySettings: {
                mode: "denyDelete",
                excludedActions: [],
                excludedPrincipals: [],
            },
            actionOnUnManage: {
                resources: "delete",
            },
            bypassStackOutOfSyncError: true,
            description: "mockDescription",
            environment: "azureCloud",
        };
        const files = {
            templateContents: JSON.parse((0, utils_1.readTestFile)("files/basic-sub/main.json")),
            parametersContents: JSON.parse((0, utils_1.readTestFile)("files/basic-sub/main.parameters.json")),
        };
        const logger = new logging_1.TestLogger();
        const expectedProperties = {
            actionOnUnmanage: config.actionOnUnManage,
            bypassStackOutOfSyncError: config.bypassStackOutOfSyncError,
            denySettings: config.denySettings,
            description: config.description,
            template: files.templateContents,
            parameters: files.parametersContents["parameters"],
        };
        const expectedPayload = {
            location: config.location,
            properties: expectedProperties,
            tags: config.tags,
        };
        const mockReturnPayload = {
            ...expectedPayload,
            properties: {
                ...expectedProperties,
                outputs: { mockOutput: { value: "foo" } },
            },
        };
        it("deploys", async () => {
            azureMocks_1.mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait.mockResolvedValue(mockReturnPayload);
            await (0, handler_1.execute)(config, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createStacksClient).toHaveBeenCalledWith(config, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait).toHaveBeenCalledWith(config.name, expectedPayload, expect.anything());
            expect(outputSetter.setOutput).toHaveBeenCalledWith("mockOutput", "foo");
            expect(outputSetter.setSecret).not.toHaveBeenCalled();
        });
        it("masks secure values", async () => {
            azureMocks_1.mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait.mockResolvedValue(mockReturnPayload);
            await (0, handler_1.execute)({ ...config, maskedOutputs: ["mockOutput"] }, files, logger, outputSetter);
            expect(outputSetter.setSecret).toHaveBeenCalledWith("foo");
        });
        it("validates", async () => {
            await (0, handler_1.execute)({ ...config, operation: "validate" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createStacksClient).toHaveBeenCalledWith({ ...config, operation: "validate" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockStacksOps.beginValidateStackAtSubscriptionAndWait).toHaveBeenCalledWith(config.name, expectedPayload);
        });
        it("deletes", async () => {
            await (0, handler_1.execute)({ ...config, operation: "delete" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createStacksClient).toHaveBeenCalledWith({ ...config, operation: "delete" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockStacksOps.beginDeleteAtSubscriptionAndWait).toHaveBeenCalledWith(config.name, {
                bypassStackOutOfSyncError: true,
                unmanageActionResources: "delete",
            });
        });
    });
    describe("resource group scope", () => {
        const scope = {
            type: "resourceGroup",
            subscriptionId: "mockSub",
            resourceGroup: "mockRg",
        };
        const config = {
            type: "deploymentStack",
            scope: scope,
            name: "mockName",
            operation: "create",
            tags: { foo: "bar" },
            denySettings: {
                mode: "denyDelete",
                excludedActions: [],
                excludedPrincipals: [],
            },
            actionOnUnManage: {
                resources: "delete",
            },
            bypassStackOutOfSyncError: true,
            description: "mockDescription",
            environment: "azureCloud",
        };
        const files = {
            templateContents: JSON.parse((0, utils_1.readTestFile)("files/basic/main.json")),
            parametersContents: JSON.parse((0, utils_1.readTestFile)("files/basic/main.parameters.json")),
        };
        const logger = new logging_1.TestLogger();
        const expectedProperties = {
            actionOnUnmanage: config.actionOnUnManage,
            bypassStackOutOfSyncError: config.bypassStackOutOfSyncError,
            denySettings: config.denySettings,
            description: config.description,
            template: files.templateContents,
            parameters: files.parametersContents["parameters"],
        };
        const expectedPayload = {
            properties: expectedProperties,
            tags: config.tags,
        };
        const mockReturnPayload = {
            ...expectedPayload,
            properties: {
                ...expectedProperties,
                outputs: { mockOutput: { value: "foo" } },
            },
        };
        it("deploys", async () => {
            azureMocks_1.mockStacksOps.beginCreateOrUpdateAtResourceGroupAndWait.mockResolvedValue(mockReturnPayload);
            await (0, handler_1.execute)(config, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createStacksClient).toHaveBeenCalledWith(config, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockStacksOps.beginCreateOrUpdateAtResourceGroupAndWait).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload, expect.anything());
            expect(outputSetter.setOutput).toHaveBeenCalledWith("mockOutput", "foo");
            expect(outputSetter.setSecret).not.toHaveBeenCalled();
        });
        it("masks secure values", async () => {
            azureMocks_1.mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait.mockResolvedValue(mockReturnPayload);
            await (0, handler_1.execute)({ ...config, maskedOutputs: ["mockOutput"] }, files, logger, outputSetter);
            expect(outputSetter.setSecret).toHaveBeenCalledWith("foo");
        });
        it("validates", async () => {
            await (0, handler_1.execute)({ ...config, operation: "validate" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createStacksClient).toHaveBeenCalledWith({ ...config, operation: "validate" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockStacksOps.beginValidateStackAtResourceGroupAndWait).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);
        });
        it("deletes", async () => {
            await (0, handler_1.execute)({ ...config, operation: "delete" }, files, logger, outputSetter);
            expect(azureMocks_1.azureMock.createStacksClient).toHaveBeenCalledWith({ ...config, operation: "delete" }, logger, scope.subscriptionId, undefined);
            expect(azureMocks_1.mockStacksOps.beginDeleteAtResourceGroupAndWait).toHaveBeenCalledWith(scope.resourceGroup, config.name, {
                bypassStackOutOfSyncError: true,
                unmanageActionResources: "delete",
            });
        });
    });
});
function getMockRestError(errorResponse) {
    const restError = new core_rest_pipeline_1.RestError("foo error");
    restError.details = { error: errorResponse };
    return restError;
}
//# sourceMappingURL=handler.test.js.map