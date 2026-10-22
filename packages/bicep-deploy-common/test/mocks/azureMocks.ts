// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeploymentsOperations } from "@azure/arm-resourcesdeployments";
import {
  DeploymentStacksOperations,
  DeploymentStacksWhatIfResultsAtResourceGroupOperations,
  DeploymentStacksWhatIfResultsAtSubscriptionOperations,
  DeploymentStacksWhatIfResultsAtManagementGroupOperations,
} from "@azure/arm-resourcesdeploymentstacks";
import type { MockedObjectDeep } from "@vitest/spy";

export const mockDeploymentsOps: Partial<
  MockedObjectDeep<DeploymentsOperations>
> = {
  createOrUpdateAtSubscriptionScope: vi.fn(),
  validateAtSubscriptionScope: vi.fn(),
  whatIfAtSubscriptionScope: vi.fn(),
  createOrUpdate: vi.fn(),
  validate: vi.fn(),
  whatIf: vi.fn(),
  createOrUpdateAtTenantScope: vi.fn(),
};

export const mockStacksOps: Partial<
  MockedObjectDeep<DeploymentStacksOperations>
> = {
  createOrUpdateAtSubscription: vi.fn(),
  validateStackAtSubscription: vi.fn(),
  deleteAtSubscription: vi.fn(),
  createOrUpdateAtResourceGroup: vi.fn(),
  validateStackAtResourceGroup: vi.fn(),
  deleteAtResourceGroup: vi.fn(),
};

export const mockStacksWhatIfAtResourceGroupOps: Partial<
  MockedObjectDeep<DeploymentStacksWhatIfResultsAtResourceGroupOperations>
> = {
  createOrUpdate: vi.fn(),
  whatIf: vi.fn(),
};

export const mockStacksWhatIfAtSubscriptionOps: Partial<
  MockedObjectDeep<DeploymentStacksWhatIfResultsAtSubscriptionOperations>
> = {
  createOrUpdate: vi.fn(),
  whatIf: vi.fn(),
};

export const mockStacksWhatIfAtManagementGroupOps: Partial<
  MockedObjectDeep<DeploymentStacksWhatIfResultsAtManagementGroupOperations>
> = {
  createOrUpdate: vi.fn(),
  whatIf: vi.fn(),
};

export const azureMock = {
  createDeploymentClient: vi.fn().mockReturnValue({
    deployments: mockDeploymentsOps,
  }),
  getDeploymentCreateClient: vi.fn().mockReturnValue({
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
