// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

type OperationMock = (...args: unknown[]) => unknown;

function mockPollerOperations(operations: Record<string, OperationMock>) {
  return Object.fromEntries(
    Object.entries(operations).map(([name, operation]) => [
      name,
      (...args: unknown[]) => ({
        pollUntilDone: () => Promise.resolve(operation(...args)),
      }),
    ]),
  );
}

export const mockDeploymentsOps = {
  createOrUpdateAtSubscriptionScope: vi.fn(),
  validateAtSubscriptionScope: vi.fn(),
  whatIfAtSubscriptionScope: vi.fn(),
  createOrUpdate: vi.fn(),
  validate: vi.fn(),
  whatIf: vi.fn(),
  createOrUpdateAtTenantScope: vi.fn(),
};

export const mockStacksOps = {
  createOrUpdateAtSubscription: vi.fn(),
  validateStackAtSubscription: vi.fn(),
  deleteAtSubscription: vi.fn(),
  createOrUpdateAtResourceGroup: vi.fn(),
  validateStackAtResourceGroup: vi.fn(),
  deleteAtResourceGroup: vi.fn(),
};

export const mockStacksWhatIfAtResourceGroupOps = {
  createOrUpdate: vi.fn(),
  whatIf: vi.fn(),
};

export const mockStacksWhatIfAtSubscriptionOps = {
  createOrUpdate: vi.fn(),
  whatIf: vi.fn(),
};

export const mockStacksWhatIfAtManagementGroupOps = {
  createOrUpdate: vi.fn(),
  whatIf: vi.fn(),
};

export const azureMock = {
  createDeploymentClient: vi.fn().mockReturnValue({
    deployments: mockPollerOperations(mockDeploymentsOps),
  }),
  createStacksClient: vi.fn().mockReturnValue({
    deploymentStacks: mockPollerOperations(mockStacksOps),
    deploymentStacksWhatIfResultsAtResourceGroup: mockPollerOperations(
      mockStacksWhatIfAtResourceGroupOps,
    ),
    deploymentStacksWhatIfResultsAtSubscription: mockPollerOperations(
      mockStacksWhatIfAtSubscriptionOps,
    ),
    deploymentStacksWhatIfResultsAtManagementGroup: mockPollerOperations(
      mockStacksWhatIfAtManagementGroupOps,
    ),
  }),
};

vi.mock("../../src/azure", () => azureMock);
