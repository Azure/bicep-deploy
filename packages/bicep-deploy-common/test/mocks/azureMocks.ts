// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { Deployments } from "@azure/arm-resources";
import { DeploymentStacks } from "@azure/arm-resourcesdeploymentstacks";

export const mockDeploymentsOps: Partial<vi.MockedObjectDeep<Deployments>> = {
  beginCreateOrUpdateAtSubscriptionScopeAndWait: vi.fn(),
  beginValidateAtSubscriptionScopeAndWait: vi.fn(),
  beginWhatIfAtSubscriptionScopeAndWait: vi.fn(),
  beginCreateOrUpdateAndWait: vi.fn(),
  beginValidateAndWait: vi.fn(),
  beginWhatIfAndWait: vi.fn(),
  beginCreateOrUpdateAtTenantScopeAndWait: vi.fn(),
};

export const mockStacksOps: Partial<vi.MockedObjectDeep<DeploymentStacks>> = {
  beginCreateOrUpdateAtSubscriptionAndWait: vi.fn(),
  beginValidateStackAtSubscriptionAndWait: vi.fn(),
  beginDeleteAtSubscriptionAndWait: vi.fn(),
  beginCreateOrUpdateAtResourceGroupAndWait: vi.fn(),
  beginValidateStackAtResourceGroupAndWait: vi.fn(),
  beginDeleteAtResourceGroupAndWait: vi.fn(),
};

export const azureMock = {
  createDeploymentClient: vi.fn().mockReturnValue({
    deployments: mockDeploymentsOps,
  }),
  createStacksClient: vi.fn().mockReturnValue({
    deploymentStacks: mockStacksOps,
  }),
};

vi.mock("../../src/azure", () => azureMock);
