// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { configureGetInputMock, mockInputReader } from "./mocks/inputMocks";
import {
  DeploymentsConfig,
  DeploymentStackConfig,
  parseConfig,
} from "../src/config";
import path from "path";

const inputReader = new mockInputReader();

describe("input validation", () => {
  it("requires type", async () => {
    configureGetInputMock({}, inputReader);

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'type' is required but not provided",
    );
  });

  it("requires a valid value for type", async () => {
    configureGetInputMock({ type: "foo" }, inputReader);

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'type' must be one of the following values: 'deployment', 'deploymentStack'",
    );
  });

  it("requires valid json for tags string", async () => {
    configureGetInputMock({ type: "deployment", tags: "invalid" }, inputReader);

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'tags' must be a valid JSON or YAML object",
    );
  });

  it("requires valid json for tags object", async () => {
    configureGetInputMock(
      { type: "deployment", tags: '{"foo": {}}' },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'tags' must be a valid JSON or YAML object",
    );
  });

  it("requires operation to be provided", async () => {
    configureGetInputMock({ type: "deployment" }, inputReader);

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'operation' is required but not provided",
    );
  });

  it("requires valid operation for deployment", async () => {
    configureGetInputMock(
      { type: "deployment", operation: "delete" },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'operation' must be one of the following values: 'create', 'validate', 'whatIf'",
    );
  });

  it("requires valid operation for deploymentStacks", async () => {
    configureGetInputMock(
      { type: "deploymentStack", operation: "whatIf" },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'operation' must be one of the following values: 'create', 'validate', 'delete'",
    );
  });

  it("validates environment input for deployment", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "what-if-exclude-change-types": "blah",
        environment: "asdf",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'environment' must be one of the following values: 'azureCloud', 'azureChinaCloud', 'azureGermanCloud', 'azureUSGovernment'",
    );
  });

  it("validates environment input for deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "action-on-unmanage-resources": "detach",
        "action-on-unmanage-managementgroups": "sadf",
        environment: "asdf",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'environment' must be one of the following values: 'azureCloud', 'azureChinaCloud', 'azureGermanCloud', 'azureUSGovernment'",
    );
  });

  it("requires subscription-id if scope is subscription", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "subscription",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'subscription-id' is required but not provided",
    );
  });

  it("requires subscription-id if scope is resourceGroup", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "resourceGroup",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'subscription-id' is required but not provided",
    );
  });

  it("requires resource-group-name if scope is resourceGroup", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'resource-group-name' is required but not provided",
    );
  });

  it("requires management-group-id if scope is managementGroup", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "managementGroup",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'management-group-id' is required but not provided",
    );
  });

  it("blocks tenant if type is deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "tenant",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'scope' must be one of the following values: 'managementGroup', 'subscription', 'resourceGroup'",
    );
  });

  it("validates what-if-exclude-change-types inputs for deployment", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "what-if-exclude-change-types": "blah",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'what-if-exclude-change-types' must be one of the following values: 'create', 'delete', 'modify', 'deploy', 'noChange', 'ignore', 'unsupported'",
    );
  });

  it("validates validation-level inputs for deployment", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "validation-level": "blah",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'validation-level' must be one of the following values: 'provider', 'template', 'providerNoRbac'",
    );
  });

  it("requires action-on-unmanage-resources for deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'action-on-unmanage-resources' is required but not provided",
    );
  });

  it("validates action-on-unmanage-resources inputs for deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "action-on-unmanage-resources": "sadf",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'action-on-unmanage-resources' must be one of the following values: 'delete', 'detach'",
    );
  });

  it("validates action-on-unmanage-resourcegroups inputs for deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "action-on-unmanage-resources": "detach",
        "action-on-unmanage-resourcegroups": "sadf",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'action-on-unmanage-resourcegroups' must be one of the following values: 'delete', 'detach'",
    );
  });

  it("validates action-on-unmanage-managementgroups inputs for deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "action-on-unmanage-resources": "detach",
        "action-on-unmanage-managementgroups": "sadf",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'action-on-unmanage-managementgroups' must be one of the following values: 'delete', 'detach'",
    );
  });

  it("requires deny-settings-mode inputs for deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "action-on-unmanage-resources": "detach",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'deny-settings-mode' is required but not provided",
    );
  });

  it("validates deny-settings-mode inputs for deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "action-on-unmanage-resources": "detach",
        "deny-settings-mode": "asdfasdf",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'deny-settings-mode' must be one of the following values: 'denyDelete', 'denyWriteAndDelete', 'none'",
    );
  });

  it("validates bypass-stack-out-of-sync-error inputs for deploymentStack", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "foo",
        "resource-group-name": "mockRg",
        "action-on-unmanage-resources": "detach",
        "bypass-stack-out-of-sync-error": "asdfasdf",
      },
      inputReader,
    );

    expect(() => parseConfig(inputReader)).toThrow(
      "Action input 'bypass-stack-out-of-sync-error' must be a boolean value",
    );
  });
});

describe("input parsing", () => {
  it("parses deployment inputs", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        name: "mockName",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "mockSub",
        "resource-group-name": "mockRg",
        location: "mockLocation",
        "template-file": "/path/to/mockTemplateFile",
        "parameters-file": "/path/to/mockParametersFile",
        parameters: '{"foo": "bar2"}',
        description: "mockDescription",
        tags: '{"foo": "bar"}',
        "masked-outputs": "abc,def",
        "what-if-exclude-change-types": "noChange",
        "validation-level": "providerNoRbac",
        environment: "azureUSGovernment",
      },
      inputReader,
    );

    const config = parseConfig(inputReader);

    expect(config).toEqual<DeploymentsConfig>({
      type: "deployment",
      name: "mockName",
      operation: "create",
      scope: {
        type: "resourceGroup",
        subscriptionId: "mockSub",
        resourceGroup: "mockRg",
      },
      location: "mockLocation",
      templateFile: path.resolve("/path/to/mockTemplateFile"),
      parametersFile: path.resolve("/path/to/mockParametersFile"),
      parameters: {
        foo: "bar2",
      },
      tags: {
        foo: "bar",
      },
      maskedOutputs: ["abc", "def"],
      whatIf: {
        excludeChangeTypes: ["noChange"],
      },
      environment: "azureUSGovernment",
      validationLevel: "providerNoRbac",
    });
  });

  it("parses deployment stacks inputs", async () => {
    configureGetInputMock(
      {
        type: "deploymentStack",
        name: "mockName",
        operation: "delete",
        scope: "subscription",
        "subscription-id": "mockSub",
        location: "mockLocation",
        "template-file": "/path/to/mockTemplateFile",
        "parameters-file": "/path/to/mockParametersFile",
        parameters: `
{
  "stringParam": "foo",
  "intParam": 123,
  "boolParam": true,
  "arrayParam": [
    "val1",
    "val2",
    "val3"
  ],
  "objectParam": {
    "prop1": "val1",
    "prop2": "val2"
  }
}`,
        description: "mockDescription",
        tags: '{"foo": "bar"}',
        "masked-outputs": "abc,def",
        "action-on-unmanage-resources": "delete",
        "action-on-unmanage-resourcegroups": "delete",
        "action-on-unmanage-managementgroups": "delete",
        "deny-settings-mode": "none",
        "deny-settings-excluded-actions": "abc,def",
        "deny-settings-excluded-principals": "ghi,jkl",
        "deny-settings-apply-to-child-scopes": "true",
        "bypass-stack-out-of-sync-error": "true",
        environment: "azureUSGovernment",
      },
      inputReader,
    );

    const config = parseConfig(inputReader);

    expect(config).toEqual<DeploymentStackConfig>({
      type: "deploymentStack",
      name: "mockName",
      operation: "delete",
      scope: {
        type: "subscription",
        subscriptionId: "mockSub",
      },
      location: "mockLocation",
      templateFile: path.resolve("/path/to/mockTemplateFile"),
      parametersFile: path.resolve("/path/to/mockParametersFile"),
      parameters: {
        stringParam: "foo",
        intParam: 123,
        boolParam: true,
        arrayParam: ["val1", "val2", "val3"],
        objectParam: {
          prop1: "val1",
          prop2: "val2",
        },
      },
      description: "mockDescription",
      tags: {
        foo: "bar",
      },
      maskedOutputs: ["abc", "def"],
      actionOnUnManage: {
        resources: "delete",
        resourceGroups: "delete",
        managementGroups: "delete",
      },
      denySettings: {
        mode: "none",
        excludedActions: ["abc", "def"],
        excludedPrincipals: ["ghi", "jkl"],
        applyToChildScopes: true,
      },
      bypassStackOutOfSyncError: true,
      environment: "azureUSGovernment",
    });
  });

  it("supports YAML syntax for parameters", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        name: "mockName",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "mockSub",
        "resource-group-name": "mockRg",
        location: "mockLocation",
        "template-file": "/path/to/mockTemplateFile",
        "parameters-file": "/path/to/mockParametersFile",
        parameters: `
stringParam: foo
intParam: 123
boolParam: true
arrayParam:
  - val1
  - val2
  - val3
objectParam:
  prop1: val1
  prop2: val2
`,
        description: "mockDescription",
        tags: '{"foo": "bar"}',
        "masked-outputs": "abc,def",
        "what-if-exclude-change-types": "noChange",
        environment: "azureUSGovernment",
      },
      inputReader,
    );

    const config = parseConfig(inputReader);

    expect(config).toEqual<DeploymentsConfig>({
      type: "deployment",
      name: "mockName",
      operation: "create",
      scope: {
        type: "resourceGroup",
        subscriptionId: "mockSub",
        resourceGroup: "mockRg",
      },
      location: "mockLocation",
      templateFile: "/path/to/mockTemplateFile",
      parametersFile: "/path/to/mockParametersFile",
      parameters: {
        stringParam: "foo",
        intParam: 123,
        boolParam: true,
        arrayParam: ["val1", "val2", "val3"],
        objectParam: {
          prop1: "val1",
          prop2: "val2",
        },
      },
      tags: {
        foo: "bar",
      },
      maskedOutputs: ["abc", "def"],
      whatIf: {
        excludeChangeTypes: ["noChange"],
      },
      environment: "azureUSGovernment",
    });
  });

  it("parses bicep-version input correctly", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "mockSub",
        "resource-group-name": "mockRg",
        "template-file": "/path/to/mockTemplateFile",
        "bicep-version": "0.30.23",
      },
      inputReader,
    );

    const config = parseConfig(inputReader);

    expect(config).toEqual<DeploymentsConfig>({
      type: "deployment",
      name: undefined,
      operation: "create",
      scope: {
        type: "resourceGroup",
        subscriptionId: "mockSub",
        resourceGroup: "mockRg",
        tenantId: undefined,
      },
      location: undefined,
      templateFile: path.resolve("/path/to/mockTemplateFile"),
      parametersFile: undefined,
      parameters: undefined,
      bicepVersion: "0.30.23", // This should contain the specified version
      tags: undefined,
      maskedOutputs: undefined,
      whatIf: {
        excludeChangeTypes: undefined,
      },
      validationLevel: undefined,
      environment: "azureCloud",
    });
  });

  it("defaults bicep-version to undefined when not provided", async () => {
    configureGetInputMock(
      {
        type: "deployment",
        operation: "create",
        scope: "resourceGroup",
        "subscription-id": "mockSub",
        "resource-group-name": "mockRg",
        "template-file": "/path/to/mockTemplateFile",
        // bicep-version not provided
      },
      inputReader,
    );

    const config = parseConfig(inputReader);

    expect(config.bicepVersion).toBeUndefined();
  });
});
