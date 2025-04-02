// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { runAction } from "./setup";

const TEST_TIMEOUT_IN_SECONDS = 5 * 60; // 5 minutes
jest.setTimeout(TEST_TIMEOUT_IN_SECONDS * 1000);

beforeEach(() => {
  jest.clearAllMocks();
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
    const rawError = JSON.parse(errors[1]);
    expect(rawError["code"]).toBe("DeploymentStackDeploymentFailed");
    expect(rawError["details"][0]["code"]).toBe("DeploymentFailed");
  });

  it("handles deployment failures", async () => {
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
    expect(JSON.parse(errors[1])["code"]).toBe("InvalidTemplateDeployment");
  });
});
