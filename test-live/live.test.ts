// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { runAction } from "./setup";

const TEST_TIMEOUT_IN_SECONDS = 5 * 60; // 5 minutes
jest.setTimeout(TEST_TIMEOUT_IN_SECONDS * 1000);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("e2e tests", () => {
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

  it("runs validation and handles failures", async () => {
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
});
