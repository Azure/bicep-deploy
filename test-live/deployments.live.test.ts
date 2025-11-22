// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { runAction } from "./setup";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deployments live tests", () => {
  it("runs validation", async () => {
    const { failure } = await runAction(
      data => `
type: deployment
operation: validate
name: 'e2e-validate'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/basic/main.bicepparam
`,
    );

    expect(failure).not.toBeDefined();
  });

  it("runs create and handles failures", async () => {
    const { failure, errors } = await runAction(
      data => `
type: deployment
operation: create
name: 'e2e-create'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/deployerror/main.bicepparam
`,
    );

    expect(failure).toContain("Create failed");
    const rawError = JSON.parse(errors[1]);
    expect(rawError["code"]).toBe("DeploymentFailed");
    expect(rawError["details"][0]["code"]).toBe("ResourceNotFound");
  });

  it("handles deployment failures", async () => {
    const { failure, errors } = await runAction(
      data => `
type: deployment
operation: validate
name: 'e2e-validate'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/validationerror/main.bicepparam
`,
    );
    
    expect(failure).toContain("Validation failed");
    expect(JSON.parse(errors[1])["code"]).toBe("InvalidTemplateDeployment");
  });

  it("runs what-if", async () => {
    const { failure } = await runAction(
      data => `
type: deployment
operation: whatIf
name: 'e2e-validate'
scope: resourceGroup
subscription-id: ${data.subscriptionId}
resource-group-name: ${data.resourceGroup}
parameters-file: test/files/basic/main.bicepparam
`,
    );

    expect(failure).not.toBeDefined();
  });

  it("handles inline yaml parameters", async () => {
    const { failure } = await runAction(
      data => `
type: deployment
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
`,
    );

    expect(failure).not.toBeDefined();
  });
});
