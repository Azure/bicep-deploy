// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  configureGetInputMock,
  mockActionsCore,
} from "./mocks/actionCoreMocks";
import { bicepDeployCommonMock } from "./mocks/bicepDeployCommonMocks";
import { run } from "../src/main";

describe("run", () => {
  beforeEach(() => {
    configureGetInputMock({
      type: "deployment",
      name: "mockName",
      operation: "create",
      scope: "resourceGroup",
      "subscription-id": "mockSub",
      "resource-group-name": "mockRg",
      location: "mockLocation",
      "parameters-file": "/path/to/mock.bicepparam",
    });
  });

  it("sets the failed result using a string error", async () => {
    bicepDeployCommonMock.resolvePath.mockImplementation(
      () => "/path/to/mock.bicepparam",
    );
    bicepDeployCommonMock.getTemplateAndParameters.mockImplementation(() => {
      throw `This is an error!`;
    });

    // this should not throw, but should log the failure
    await run();
    expect(mockActionsCore.setFailed).toHaveBeenCalledWith("This is an error!");
  });

  it("sets the failed result using an Error", async () => {
    bicepDeployCommonMock.resolvePath.mockImplementation(
      () => "/path/to/mock.bicepparam",
    );
    bicepDeployCommonMock.getTemplateAndParameters.mockImplementation(() => {
      throw Error(`This is an error!`);
    });

    // this should not throw, but should log the failure
    await run();
    expect(mockActionsCore.setFailed).toHaveBeenCalledWith("This is an error!");
  });
});
