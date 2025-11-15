"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.azureMock = exports.mockStacksOps = exports.mockDeploymentsOps = void 0;
exports.mockDeploymentsOps = {
    beginCreateOrUpdateAtSubscriptionScopeAndWait: jest.fn(),
    beginValidateAtSubscriptionScopeAndWait: jest.fn(),
    beginWhatIfAtSubscriptionScopeAndWait: jest.fn(),
    beginCreateOrUpdateAndWait: jest.fn(),
    beginValidateAndWait: jest.fn(),
    beginWhatIfAndWait: jest.fn(),
};
exports.mockStacksOps = {
    beginCreateOrUpdateAtSubscriptionAndWait: jest.fn(),
    beginValidateStackAtSubscriptionAndWait: jest.fn(),
    beginDeleteAtSubscriptionAndWait: jest.fn(),
    beginCreateOrUpdateAtResourceGroupAndWait: jest.fn(),
    beginValidateStackAtResourceGroupAndWait: jest.fn(),
    beginDeleteAtResourceGroupAndWait: jest.fn(),
};
exports.azureMock = {
    createDeploymentClient: jest.fn().mockReturnValue({
        deployments: exports.mockDeploymentsOps,
    }),
    createStacksClient: jest.fn().mockReturnValue({
        deploymentStacks: exports.mockStacksOps,
    }),
};
jest.mock("../../src/azure", () => exports.azureMock);
//# sourceMappingURL=azureMocks.js.map