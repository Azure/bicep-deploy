// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export const bicepDeployCommonMock = {
  ...jest.requireActual("@azure/bicep-deploy-common"),
  getTemplateAndParameters: jest.fn(),
  resolvePath: jest.fn(),
};

jest.mock("@azure/bicep-deploy-common", () => bicepDeployCommonMock);
