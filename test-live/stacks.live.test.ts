// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { runAction } from "./setup";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("stacks live tests", () => {
  it("runs validation", async () => {
    const { failure } = await runAction(
      data => `
type: deploymentStack
operation: validate
name: 'e2e-validate'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/basic/main.bicepparam
action-on-unmanage-resources: delete
action-on-unmanage-resourcegroups: delete
deny-settings-mode: denyWriteAndDelete
`,
    );

    expect(failure).not.toBeDefined();
  });

  it("runs what-if", async () => {
    // what-if requires the stack to already exist
    await runAction(
      data => `
type: deploymentStack
operation: create
name: 'e2e-whatif'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/basic/main.bicepparam
action-on-unmanage-resources: delete
action-on-unmanage-resourcegroups: delete
deny-settings-mode: denyWriteAndDelete
`,
    );

    const { failure } = await runAction(
      data => `
type: deploymentStack
operation: whatIf
name: 'e2e-whatif'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/basic/main.bicepparam
action-on-unmanage-resources: delete
action-on-unmanage-resourcegroups: delete
deny-settings-mode: denyWriteAndDelete
`,
    );

    expect(failure).not.toBeDefined();
  });

  it("runs create and handles failures", async () => {
    const { failure, errors } = await runAction(
      data => `
type: deploymentStack
operation: create
name: 'e2e-create'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/deployerror/main.bicepparam
action-on-unmanage-resources: delete
action-on-unmanage-resourcegroups: delete
deny-settings-mode: denyWriteAndDelete
`,
    );

    expect(failure).toContain("Create failed");
    const errorMessage = errors.find(message =>
      message.includes("DeploymentStackDeploymentFailed"),
    );
    expect(errorMessage).toBeDefined();
    const rawError = JSON.parse(errorMessage ?? "{}");
    expect(rawError["code"]).toBe("DeploymentStackDeploymentFailed");
    expect(rawError["message"]).toContain(
      "One or more resources could not be deployed",
    );
  });

  it("handles validation failures", async () => {
    const { failure, errors } = await runAction(
      data => `
type: deploymentStack
operation: validate
name: 'e2e-validate'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/validationerror/main.bicepparam
action-on-unmanage-resources: delete
action-on-unmanage-resourcegroups: delete
deny-settings-mode: denyWriteAndDelete
`,
    );

    expect(failure).toContain("Validation failed");
    const errorMessage = errors.find(message =>
      message.includes("InvalidTemplateDeployment"),
    );
    expect(errorMessage).toBeDefined();
    expect(JSON.parse(errorMessage ?? "{}")["code"]).toBe(
      "InvalidTemplateDeployment",
    );
  });

  it("handles inline yaml parameters", async () => {
    const { failure } = await runAction(
      data => `
type: deploymentStack
operation: validate
name: 'e2e-validate'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
template-file: test/files/basic/main.bicep
parameters: |
  intParam: 42
  stringParam: hello world
  objectParam:
    prop1: value1
    prop2: value2
action-on-unmanage-resources: delete
action-on-unmanage-resourcegroups: delete
deny-settings-mode: denyWriteAndDelete
`,
    );

    expect(failure).not.toBeDefined();
  });
});
