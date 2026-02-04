// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { mockOutputSetter } from "./mocks/outputMocks";
import {
  azureMock,
  mockDeploymentsOps,
  mockStacksOps,
} from "./mocks/azureMocks";
import { mockFile } from "./mocks/fileMocks";
import { RestError } from "@azure/core-rest-pipeline";

import {
  DeploymentsConfig,
  DeploymentStackConfig,
  ResourceGroupScope,
  SubscriptionScope,
} from "../src/config";
import { ParsedFiles } from "../src/file";
import { TestLogger } from "./logging";
import { execute } from "../src/handler";
import { readTestFile } from "./utils";
import { errorMessages, resetErrorMessages } from "../src/errorMessages";
import { loggingMessages, resetLoggingMessages } from "../src/loggingMessages";
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

const outputSetter = new mockOutputSetter();

describe("deployment execution", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

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
      environment: "azureCloud",
      validationLevel: "providerNoRbac",
    };

    const files: ParsedFiles = {
      templateContents: JSON.parse(readTestFile("files/basic-sub/main.json")),
      parametersContents: JSON.parse(
        readTestFile("files/basic-sub/main.parameters.json"),
      ),
    };

    const logger = new TestLogger();

    beforeEach(() => {
      mockFile.getTemplateAndParameters.mockResolvedValue(files);
    });

    const expectedProperties: DeploymentProperties = {
      mode: "Incremental",
      template: files.templateContents,
      parameters: files.parametersContents["parameters"],
      expressionEvaluationOptions: {
        scope: "inner",
      },
      validationLevel: "providerNoRbac",
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

      await execute(config, logger, outputSetter);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        config,
        logger,
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait,
      ).toHaveBeenCalledWith(config.name, expectedPayload, expect.anything());
      expect(outputSetter.setOutput).toHaveBeenCalledWith("mockOutput", "foo");
      expect(outputSetter.setSecret).not.toHaveBeenCalled();
    });

    it("masks secure values", async () => {
      mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute(
        { ...config, maskedOutputs: ["mockOutput"] },
        logger,
        outputSetter,
      );

      expect(outputSetter.setSecret).toHaveBeenCalledWith("foo");
    });

    it("validates", async () => {
      await execute({ ...config, operation: "validate" }, logger, outputSetter);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        { ...config, operation: "validate" },
        logger,
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

      await execute({ ...config, operation: "whatIf" }, logger, outputSetter);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        { ...config, operation: "whatIf" },
        logger,
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
      environment: "azureCloud",
      validationLevel: "providerNoRbac",
    };

    const files: ParsedFiles = {
      templateContents: JSON.parse(readTestFile("files/basic/main.json")),
      parametersContents: JSON.parse(
        readTestFile("files/basic/main.parameters.json"),
      ),
    };

    const logger = new TestLogger();

    beforeEach(() => {
      mockFile.getTemplateAndParameters.mockResolvedValue(files);
    });

    const expectedProperties: DeploymentProperties = {
      mode: "Incremental",
      template: files.templateContents,
      parameters: files.parametersContents["parameters"],
      expressionEvaluationOptions: {
        scope: "inner",
      },
      validationLevel: "providerNoRbac",
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

      await execute(config, logger, outputSetter);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        config,
        logger,
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockDeploymentsOps.beginCreateOrUpdateAndWait,
      ).toHaveBeenCalledWith(
        scope.resourceGroup,
        config.name,
        expectedPayload,
        expect.anything(),
      );
      expect(outputSetter.setOutput).toHaveBeenCalledWith("mockOutput", "foo");
      expect(outputSetter.setSecret).not.toHaveBeenCalled();
    });

    it("masks secure values", async () => {
      mockDeploymentsOps.beginCreateOrUpdateAtSubscriptionScopeAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute(
        { ...config, maskedOutputs: ["mockOutput"] },
        logger,
        outputSetter,
      );

      expect(outputSetter.setSecret).toHaveBeenCalledWith("foo");
    });

    it("handles deploy errors", async () => {
      mockDeploymentsOps.beginCreateOrUpdateAndWait!.mockRejectedValue(
        getMockRestError(mockError),
      );

      const spyLogError = vi.spyOn(logger, "logError");

      await execute({ ...config, operation: "create" }, logger, outputSetter);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        { ...config, operation: "create" },
        logger,
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockDeploymentsOps.beginCreateOrUpdateAndWait,
      ).toHaveBeenCalledWith(
        scope.resourceGroup,
        config.name,
        expectedPayload,
        expect.anything(),
      );

      expect(spyLogError).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("Request failed. CorrelationId: "),
      );

      expect(spyLogError).toHaveBeenNthCalledWith(
        2,
        JSON.stringify(mockError, null, 2),
      );
    });

    it("validates", async () => {
      await execute({ ...config, operation: "validate" }, logger, outputSetter);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        { ...config, operation: "validate" },
        logger,
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

      const spyLogError = vi.spyOn(logger, "logError");

      await execute({ ...config, operation: "validate" }, logger, outputSetter);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        { ...config, operation: "validate" },
        logger,
        scope.subscriptionId,
        undefined,
      );
      expect(mockDeploymentsOps.beginValidateAndWait).toHaveBeenCalledWith(
        scope.resourceGroup,
        config.name,
        expectedPayload,
      );

      expect(spyLogError).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("Request failed. CorrelationId: "),
      );

      expect(spyLogError).toHaveBeenNthCalledWith(
        2,
        JSON.stringify(mockError, null, 2),
      );
    });

    it("what-ifs", async () => {
      mockDeploymentsOps.beginWhatIfAndWait!.mockResolvedValue({});

      await execute({ ...config, operation: "whatIf" }, logger, outputSetter);

      expect(azureMock.createDeploymentClient).toHaveBeenCalledWith(
        { ...config, operation: "whatIf" },
        logger,
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
  afterEach(() => vi.clearAllMocks());

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
      environment: "azureCloud",
    };

    const files: ParsedFiles = {
      templateContents: JSON.parse(readTestFile("files/basic-sub/main.json")),
      parametersContents: JSON.parse(
        readTestFile("files/basic-sub/main.parameters.json"),
      ),
    };

    const logger = new TestLogger();

    beforeEach(() => {
      mockFile.getTemplateAndParameters.mockResolvedValue(files);
    });

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

      await execute(config, logger, outputSetter);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        config,
        logger,
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait,
      ).toHaveBeenCalledWith(config.name, expectedPayload, expect.anything());
      expect(outputSetter.setOutput).toHaveBeenCalledWith("mockOutput", "foo");
      expect(outputSetter.setSecret).not.toHaveBeenCalled();
    });

    it("masks secure values", async () => {
      mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute(
        { ...config, maskedOutputs: ["mockOutput"] },
        logger,
        outputSetter,
      );

      expect(outputSetter.setSecret).toHaveBeenCalledWith("foo");
    });

    it("validates", async () => {
      await execute({ ...config, operation: "validate" }, logger, outputSetter);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        { ...config, operation: "validate" },
        logger,
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginValidateStackAtSubscriptionAndWait,
      ).toHaveBeenCalledWith(config.name, expectedPayload);
    });

    it("deletes", async () => {
      await execute({ ...config, operation: "delete" }, logger, outputSetter);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        { ...config, operation: "delete" },
        logger,
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

    it.each([
      { templateFile: "main.bicep", parametersFile: undefined },
      { templateFile: undefined, parametersFile: "main.bicepparam" },
      { templateFile: "main.bicep", parametersFile: "main.bicepparam" },
    ])(
      "warns when files are provided for delete operation ($templateFile, $parametersFile)",
      async ({ templateFile, parametersFile }) => {
        const spyLogWarning = vi.spyOn(logger, "logWarning");

        await execute(
          { ...config, operation: "delete", templateFile, parametersFile },
          logger,
          outputSetter,
        );

        expect(spyLogWarning).toHaveBeenCalledWith(
          "Template and parameter files are not required for delete operations and will be ignored.",
        );
      },
    );

    it("does not warn when no files are provided for delete operation", async () => {
      const spyLogWarning = vi.spyOn(logger, "logWarning");

      await execute(
        {
          ...config,
          operation: "delete",
          templateFile: undefined,
          parametersFile: undefined,
        },
        logger,
        outputSetter,
      );

      expect(spyLogWarning).not.toHaveBeenCalled();
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
      environment: "azureCloud",
    };

    const files: ParsedFiles = {
      templateContents: JSON.parse(readTestFile("files/basic/main.json")),
      parametersContents: JSON.parse(
        readTestFile("files/basic/main.parameters.json"),
      ),
    };

    const logger = new TestLogger();

    beforeEach(() => {
      mockFile.getTemplateAndParameters.mockResolvedValue(files);
    });

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

      await execute(config, logger, outputSetter);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        config,
        logger,
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginCreateOrUpdateAtResourceGroupAndWait,
      ).toHaveBeenCalledWith(
        scope.resourceGroup,
        config.name,
        expectedPayload,
        expect.anything(),
      );
      expect(outputSetter.setOutput).toHaveBeenCalledWith("mockOutput", "foo");
      expect(outputSetter.setSecret).not.toHaveBeenCalled();
    });

    it("masks secure values", async () => {
      mockStacksOps.beginCreateOrUpdateAtSubscriptionAndWait!.mockResolvedValue(
        mockReturnPayload,
      );

      await execute(
        { ...config, maskedOutputs: ["mockOutput"] },
        logger,
        outputSetter,
      );

      expect(outputSetter.setSecret).toHaveBeenCalledWith("foo");
    });

    it("validates", async () => {
      await execute({ ...config, operation: "validate" }, logger, outputSetter);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        { ...config, operation: "validate" },
        logger,
        scope.subscriptionId,
        undefined,
      );
      expect(
        mockStacksOps.beginValidateStackAtResourceGroupAndWait,
      ).toHaveBeenCalledWith(scope.resourceGroup, config.name, expectedPayload);
    });

    it("deletes", async () => {
      await execute({ ...config, operation: "delete" }, logger, outputSetter);

      expect(azureMock.createStacksClient).toHaveBeenCalledWith(
        { ...config, operation: "delete" },
        logger,
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

describe("custom error messages", () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetErrorMessages();
  });

  const config: DeploymentsConfig = {
    type: "deployment",
    scope: {
      type: "resourceGroup",
      subscriptionId: "sub",
      resourceGroup: "rg",
    },
    operation: "validate",
    whatIf: {},
    environment: "azureCloud",
  };

  const files: ParsedFiles = {
    templateContents: {},
    parametersContents: { parameters: {} },
  };

  const logger = new TestLogger();

  beforeEach(() => {
    mockFile.getTemplateAndParameters.mockResolvedValue(files);
  });

  it("uses custom validation error message when provided", async () => {
    const mockError = {
      code: "InvalidTemplateDeployment",
      message: "Validation failed",
    };

    mockDeploymentsOps.beginValidateAndWait!.mockRejectedValue(
      getMockRestError(mockError),
    );

    const spySetFailed = vi.spyOn(outputSetter, "setFailed");

    await execute(config, logger, outputSetter, {
      validationFailed: "Custom validation error message",
    });

    expect(spySetFailed).toHaveBeenCalledWith(
      "Custom validation error message",
    );
    expect(errorMessages.validationFailed).toBe(
      "Custom validation error message",
    );
  });

  it("uses custom correlation error message when provided", async () => {
    const mockError = { code: "DeploymentFailed", message: "Deploy failed" };

    mockDeploymentsOps.beginCreateOrUpdateAndWait!.mockRejectedValue(
      getMockRestError(mockError),
    );

    const spyLogError = vi.spyOn(logger, "logError");

    await execute(config, logger, outputSetter, {
      requestFailedCorrelation: (id: string) =>
        `Request failed with correlation ID: ${id}`,
    });

    expect(spyLogError).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Request failed with correlation ID: "),
    );
  });
});

describe("custom logging messages", () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetLoggingMessages();
  });

  const config: DeploymentsConfig = {
    type: "deployment",
    scope: {
      type: "resourceGroup",
      subscriptionId: "sub",
      resourceGroup: "rg",
    },
    operation: "validate",
    whatIf: {},
    environment: "azureCloud",
  };

  const files: ParsedFiles = {
    templateContents: {},
    parametersContents: { parameters: {} },
  };

  const logger = new TestLogger();

  beforeEach(() => {
    mockFile.getTemplateAndParameters.mockResolvedValue(files);
  });

  it("uses custom diagnostics message when provided", async () => {
    const spyLogInfo = vi.spyOn(logger, "logInfo");

    mockDeploymentsOps.beginValidateAndWait!.mockResolvedValue({
      properties: {
        diagnostics: [
          {
            level: "Info",
            code: "INFO001",
            message: "Test diagnostic message",
          },
        ],
      },
    });

    await execute(config, logger, outputSetter, undefined, {
      diagnosticsReturned: "Custom diagnostics message",
    });

    expect(spyLogInfo).toHaveBeenCalledWith("Custom diagnostics message");
    expect(loggingMessages.diagnosticsReturned).toBe(
      "Custom diagnostics message",
    );
  });
});

function getMockRestError(errorResponse: ErrorResponse) {
  const restError = new RestError("foo error");
  restError.details = { error: errorResponse };
  restError.response = {
    headers: {
      get: (name: string) =>
        name === "x-ms-correlation-request-id"
          ? "test-correlation-id"
          : undefined,
    },
  } as RestError["response"];

  return restError;
}
