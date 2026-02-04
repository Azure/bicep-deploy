// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
export const bicepDeployCommonMock = {
  execute: vi.fn(),
  resolvePath: vi.fn(),
};

vi.mock("@azure/bicep-deploy-common", async () => {
  const actual = await vi.importActual("@azure/bicep-deploy-common");
  return {
    ...actual,
    ...bicepDeployCommonMock,
  };
});
