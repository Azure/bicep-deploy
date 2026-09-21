// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { Deployments } from "@azure/arm-resources";
import {
  DeploymentStacksOperations,
  DeploymentStacksWhatIfResultsAtResourceGroupOperations,
  DeploymentStacksWhatIfResultsAtSubscriptionOperations,
  DeploymentStacksWhatIfResultsAtManagementGroupOperations,
} from "@azure/arm-resourcesdeploymentstacks";
import type { MockedObjectDeep } from "@vitest/spy";

export const mockDeploymentsOps: Partial<MockedObjectDeep<Deployments>> = {
  beginCreateOrUpdateAtSubscriptionScopeAndWait: vi.fn(),
  beginValidateAtSubscriptionScopeAndWait: vi.fn(),
  beginWhatIfAtSubscriptionScopeAndWait: vi.fn(),
  beginCreateOrUpdateAndWait: vi.fn(),
  beginValidateAndWait: vi.fn(),
  beginWhatIfAndWait: vi.fn(),
  beginCreateOrUpdateAtTenantScopeAndWait: vi.fn(),
};

export const mockStacksOps: Partial<
  MockedObjectDeep<DeploymentStacksOperations>
> = {
  beginCreateOrUpdateAtSubscriptionAndWait: vi.fn(),
  beginValidateStackAtSubscriptionAndWait: vi.fn(),
  beginDeleteAtSubscriptionAndWait: vi.fn(),
  beginCreateOrUpdateAtResourceGroupAndWait: vi.fn(),
  beginValidateStackAtResourceGroupAndWait: vi.fn(),
  beginDeleteAtResourceGroupAndWait: vi.fn(),
};

export const mockStacksWhatIfAtResourceGroupOps: Partial<
  MockedObjectDeep<DeploymentStacksWhatIfResultsAtResourceGroupOperations>
> = {
  beginCreateOrUpdateAndWait: vi.fn(),
  beginWhatIfAndWait: vi.fn(),
};

export const mockStacksWhatIfAtSubscriptionOps: Partial<
  MockedObjectDeep<DeploymentStacksWhatIfResultsAtSubscriptionOperations>
> = {
  beginCreateOrUpdateAndWait: vi.fn(),
  beginWhatIfAndWait: vi.fn(),
};

export const mockStacksWhatIfAtManagementGroupOps: Partial<
  MockedObjectDeep<DeploymentStacksWhatIfResultsAtManagementGroupOperations>
> = {
  beginCreateOrUpdateAndWait: vi.fn(),
  beginWhatIfAndWait: vi.fn(),
};

export const azureMock = {
  createDeploymentClient: vi.fn().mockReturnValue({
    deployments: mockDeploymentsOps,
  }),
  createStacksClient: vi.fn().mockReturnValue({
    deploymentStacks: mockStacksOps,
    deploymentStacksWhatIfResultsAtResourceGroup:
      mockStacksWhatIfAtResourceGroupOps,
    deploymentStacksWhatIfResultsAtSubscription:
      mockStacksWhatIfAtSubscriptionOps,
    deploymentStacksWhatIfResultsAtManagementGroup:
      mockStacksWhatIfAtManagementGroupOps,
  }),
};

vi.mock("../../src/azure", () => azureMock);
