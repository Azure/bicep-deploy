// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { Deployments } from "@azure/arm-resources";
import { DeploymentStacks } from "@azure/arm-resourcesdeploymentstacks";

export const mockDeploymentsOps: Partial<jest.MockedObjectDeep<Deployments>> = {
  beginCreateOrUpdateAtSubscriptionScopeAndWait: jest.fn(),
  beginValidateAtSubscriptionScopeAndWait: jest.fn(),
  beginWhatIfAtSubscriptionScopeAndWait: jest.fn(),
  beginCreateOrUpdateAndWait: jest.fn(),
  beginValidateAndWait: jest.fn(),
  beginWhatIfAndWait: jest.fn(),
};

export const mockStacksOps: Partial<jest.MockedObjectDeep<DeploymentStacks>> = {
  beginCreateOrUpdateAtSubscriptionAndWait: jest.fn(),
  beginValidateStackAtSubscriptionAndWait: jest.fn(),
  beginDeleteAtSubscriptionAndWait: jest.fn(),
  beginCreateOrUpdateAtResourceGroupAndWait: jest.fn(),
  beginValidateStackAtResourceGroupAndWait: jest.fn(),
  beginDeleteAtResourceGroupAndWait: jest.fn(),
};

export const azureMock = {
  createDeploymentClient: jest.fn().mockReturnValue({
    deployments: mockDeploymentsOps,
  }),
  createStacksClient: jest.fn().mockReturnValue({
    deploymentStacks: mockStacksOps,
  }),
};

jest.mock("../../src/helpers/azure", () => azureMock);
