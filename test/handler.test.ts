// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { mockActionsCore } from "./mocks/actionCoreMocks";
import {
  mockDeploymentsOps,
  mockStacksOps,
  azureMock,
} from "./mocks/azureMocks";
import { RestError } from "@azure/core-rest-pipeline";
import {
  DeploymentsConfig,
  DeploymentStackConfig,
  ResourceGroupScope,
  SubscriptionScope,
} from "../src/config";
import { readTestFile } from "./utils";
import { execute } from "../src/handler";
import { ParsedFiles } from "../src/helpers/file";
import {
  Deployment,
  DeploymentExtended,
  DeploymentProperties,
  ErrorResponse,
} from "@azure/arm-resources";
import {
  DeploymentStack,
  DeploymentStackProperties,
} from "@azure/arm-resourcesdeploymentstacks";
import { Color, colorize } from "../src/helpers/logging";

describe("deployment execution", () => {
  afterEach(() => jest.clearAllMocks());

  describe("subscription scope", () => {
    const scope: SubscriptionScope = {
      type: "subscription",
      subscriptionId: "mockSub",
    };

    const config: DeploymentsConfig = {
      location: "mockLocation",
      type: "deployment",
      scope: scope,
      name: "mockName",
      operation: "create",
      tags: { foo: "bar" },
      whatIf: {
        excludeChangeTypes: ["noChange"],
      },
    };

    const files: ParsedFiles = {
      templateContents: JSON.parse(readTestFile("files/basic/main.json")),
      parametersContents: JSON.parse(
        readTestFile("files/basic/main.parameters.json"),
      ),
    };

    const expectedProperties: DeploymentProperties = {
      mode: "Incremental",
      template: files.templateContents,
      parameters: files.parametersContents["parameters"],
      expressionEvaluationOptions: {
        scope: "inner",
      },
    };

    const expectedPayload: Deployment = {
      location: config.location,
      properties: expectedProperties,
      tags: config.tags,
    };

    const mockReturnPayload: DeploymentExtended = {
      ...expectedPayload,
      properties: {
        ...expectedProperties,
        outputs: { mockOutput: { value: "foo" } },
      },
    };

    it("deploys", async () => {
      mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute(config, files);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait,
      ).toHaveBeenCalledWith(config.name, expectedPayload);
      expect(mockActionsCore.setOutput).toHaveBeenCalledWith(
        "mockOutput",
        "foo",
      );
      expect(mockActionsCore.setSecret).not.toHaveBeenCalled();
    });

    it("masks secure values", async () => {
      mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute({ ...config, maskedOutputs: ["mockOutput"] }, files);

      expect(mockActionsCore.setSecret).toHaveBeenCalledWith("foo");
    });

    it("validates", async () => {
      await execute({ ...config, operation: "validate" }, files);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockDeploymentsOps.beginValidateAtSubscriptionScopeAndWait,
      ).toHaveBeenCalledWith(config.name, expectedPayload);
    });

    it("what-ifs", async () => {
      mockDeploymentsOps.beginWhatIfAtSubscriptionScopeAndWait!.mockResolvedValue(
        {},
      );

      await execute({ ...config, operation: "whatIf" }, files);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockDeploymentsOps.beginWhatIfAtSubscriptionScopeAndWait,
      ).toHaveBeenCalledWith(config.name, expectedPayload);
    });
  });

  describe("resource group scope", () => {
    const scope: ResourceGroupScope = {
      type: "resourceGroup",
      subscriptionId: "mockSub",
      resourceGroup: "mockRg",
    };

    const config: DeploymentsConfig = {
      type: "deployment",
      scope: scope,
      name: "mockName",
      operation: "create",
      tags: { foo: "bar" },
      whatIf: {
        excludeChangeTypes: ["noChange"],
      },
    };

    const files: ParsedFiles = {
      templateContents: JSON.parse(readTestFile("files/basic/main.json")),
      parametersContents: JSON.parse(
        readTestFile("files/basic/main.parameters.json"),
      ),
    };

    const expectedProperties: DeploymentProperties = {
      mode: "Incremental",
      template: files.templateContents,
      parameters: files.parametersContents["parameters"],
      expressionEvaluationOptions: {
        scope: "inner",
      },
    };

    const expectedPayload: Deployment = {
      properties: expectedProperties,
      tags: config.tags,
    };

    const mockReturnPayload: DeploymentExtended = {
      ...expectedPayload,
      properties: {
        ...expectedProperties,
        outputs: { mockOutput: { value: "foo" } },
      },
    };
    const mockError = {
      code: "InvalidTemplateDeployment",
      message:
        "The template deployment 'azure-bicep-deploy' is not valid according to the validation procedure. The tracking id is '06d4fb15-ecb0-4682-a6d9-1bf416ca0722'. See inner errors for details.",
      details: [
        {
          code: "PreflightValidationCheckFailed",
          message:
            "Preflight validation failed. Please refer to the details for the specific errors.",
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
      mockDeploymentsOps.beginCreateOrUpdateAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute(config, files);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockDeploymentsOps.beginCreateOrUpdateAndWait,
      ).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);
      expect(mockActionsCore.setOutput).toHaveBeenCalledWith(
        "mockOutput",
        "foo",
      );
      expect(mockActionsCore.setSecret).not.toHaveBeenCalled();
    });

    it("masks secure values", async () => {
      mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute({ ...config, maskedOutputs: ["mockOutput"] }, files);

      expect(mockActionsCore.setSecret).toHaveBeenCalledWith("foo");
    });

    it("handles deploy errors", async () => {
      mockDeploymentsOps.beginCreateOrUpdateAndWait!.mockRejectedValue(
        getMockRestError(mockError),
      );

      await execute({ ...config, operation: "create" }, files);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockDeploymentsOps.beginCreateOrUpdateAndWait,
      ).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);

      expect(mockActionsCore.error).toHaveBeenCalledWith(
        colorize(JSON.stringify(mockError, null, 2), Color.Red),
      );
    });

    it("validates", async () => {
      await execute({ ...config, operation: "validate" }, files);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(mockDeploymentsOps.beginValidateAndWait).toHaveBeenCalledWith(
        scope.resourceGroup,
        config.name,
        expectedPayload,
      );
    });

    it("handles validate errors", async () => {
      mockDeploymentsOps.beginValidateAndWait!.mockRejectedValue(
        getMockRestError(mockError),
      );

      await execute({ ...config, operation: "validate" }, files);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(mockDeploymentsOps.beginValidateAndWait).toHaveBeenCalledWith(
        scope.resourceGroup,
        config.name,
        expectedPayload,
      );

      expect(mockActionsCore.error).toHaveBeenCalledWith(
        colorize(JSON.stringify(mockError, null, 2), Color.Red),
      );
    });

    it("what-ifs", async () => {
      mockDeploymentsOps.beginWhatIfAndWait!.mockResolvedValue({});

      await execute({ ...config, operation: "whatIf" }, files);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(mockDeploymentsOps.beginWhatIfAndWait).toHaveBeenCalledWith(
        scope.resourceGroup,
        config.name,
        expectedPayload,
      );
    });
  });
});

describe("stack execution", () => {
  afterEach(() => jest.clearAllMocks());

  describe("subscription scope", () => {
    const scope: SubscriptionScope = {
      type: "subscription",
      subscriptionId: "mockSub",
    };

    const config: DeploymentStackConfig = {
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
    };

    const files: ParsedFiles = {
      templateContents: JSON.parse(readTestFile("files/basic/main.json")),
      parametersContents: JSON.parse(
        readTestFile("files/basic/main.parameters.json"),
      ),
    };

    const expectedProperties: DeploymentStackProperties = {
      actionOnUnmanage: config.actionOnUnManage,
      bypassStackOutOfSyncError: config.bypassStackOutOfSyncError,
      denySettings: config.denySettings,
      description: config.description,
      template: files.templateContents,
      parameters: files.parametersContents["parameters"],
    };

    const expectedPayload: DeploymentStack = {
      location: config.location,
      properties: expectedProperties,
      tags: config.tags,
    };

    const mockReturnPayload: DeploymentStack = {
      ...expectedPayload,
      properties: {
        ...expectedProperties,
        outputs: { mockOutput: { value: "foo" } },
      },
    };

    it("deploys", async () => {
      mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute(config, files);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait,
      ).toHaveBeenCalledWith(config.name, expectedPayload);
      expect(mockActionsCore.setOutput).toHaveBeenCalledWith(
        "mockOutput",
        "foo",
      );
      expect(mockActionsCore.setSecret).not.toHaveBeenCalled();
    });

    it("masks secure values", async () => {
      mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute({ ...config, maskedOutputs: ["mockOutput"] }, files);

      expect(mockActionsCore.setSecret).toHaveBeenCalledWith("foo");
    });

    it("validates", async () => {
      await execute({ ...config, operation: "validate" }, files);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginValidateStackAtSubscriptionAndWait,
      ).toHaveBeenCalledWith(config.name, expectedPayload);
    });

    it("deletes", async () => {
      await execute({ ...config, operation: "delete" }, files);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginDeleteAtSubscriptionAndWait,
      ).toHaveBeenCalledWith(config.name, {
        bypassStackOutOfSyncError: true,
        unmanageActionResources: "delete",
      });
    });
  });

  describe("resource group scope", () => {
    const scope: ResourceGroupScope = {
      type: "resourceGroup",
      subscriptionId: "mockSub",
      resourceGroup: "mockRg",
    };

    const config: DeploymentStackConfig = {
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
    };

    const files: ParsedFiles = {
      templateContents: JSON.parse(readTestFile("files/basic/main.json")),
      parametersContents: JSON.parse(
        readTestFile("files/basic/main.parameters.json"),
      ),
    };

    const expectedProperties: DeploymentStackProperties = {
      actionOnUnmanage: config.actionOnUnManage,
      bypassStackOutOfSyncError: config.bypassStackOutOfSyncError,
      denySettings: config.denySettings,
      description: config.description,
      template: files.templateContents,
      parameters: files.parametersContents["parameters"],
    };

    const expectedPayload: DeploymentStack = {
      properties: expectedProperties,
      tags: config.tags,
    };

    const mockReturnPayload: DeploymentStack = {
      ...expectedPayload,
      properties: {
        ...expectedProperties,
        outputs: { mockOutput: { value: "foo" } },
      },
    };

    it("deploys", async () => {
      mockStacksOps.beginCreateOrUpdateAtResourceGroupAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute(config, files);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginCreateOrUpdateAtResourceGroupAndWait,
      ).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);
      expect(mockActionsCore.setOutput).toHaveBeenCalledWith(
        "mockOutput",
        "foo",
      );
      expect(mockActionsCore.setSecret).not.toHaveBeenCalled();
    });

    it("masks secure values", async () => {
      mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute({ ...config, maskedOutputs: ["mockOutput"] }, files);

      expect(mockActionsCore.setSecret).toHaveBeenCalledWith("foo");
    });

    it("validates", async () => {
      await execute({ ...config, operation: "validate" }, files);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginValidateStackAtResourceGroupAndWait,
      ).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);
    });

    it("deletes", async () => {
      await execute({ ...config, operation: "delete" }, files);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginDeleteAtResourceGroupAndWait,
      ).toHaveBeenCalledWith(scope.resourceGroup, config.name, {
        bypassStackOutOfSyncError: true,
        unmanageActionResources: "delete",
      });
    });
  });
});

function getMockRestError(errorResponse: ErrorResponse) {
  const restError = new RestError("foo error");
  restError.details = { error: errorResponse };

  return restError;
}
