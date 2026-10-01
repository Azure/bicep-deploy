// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const assert = require("node:assert/strict");
const path = require("node:path");
const rewiremock = require("rewiremock/node");

let deploymentCreateCalls = 0;
let stackCreateCalls = 0;

async function deploymentCreate() {
  deploymentCreateCalls++;
  return { properties: { outputs: {} } };
}

async function stackCreate() {
  stackCreateCalls++;
  return { properties: { outputs: {} } };
}

const logger = {
  isDebugEnabled: () => false,
  debug: () => {},
  logInfo: () => {},
  logWarning: () => {},
  logError: () => {},
  logExternalOutput: () => {},
};

const outputSetter = {
  setOutput: () => {},
  setFailed: message => {
    throw message instanceof Error ? message : new Error(String(message));
  },
  setSecret: () => {},
};

const bicepCache = {
  find: async () => undefined,
  save: async installedPath => installedPath,
};

const templateFile = path.join(__dirname, "main.json");
const commonConfig = {
  name: "consumer-fixture",
  environment: "azureCloud",
  templateFile,
  scope: {
    type: "resourceGroup",
    subscriptionId: "00000000-0000-0000-0000-000000000000",
    resourceGroup: "consumer-fixture",
  },
};

async function main() {
  rewiremock.enable();
  rewiremock("@azure/bicep-deploy-common/deployments")
    .callThrough()
    .with({ deploymentCreate });
  rewiremock("@azure/bicep-deploy-common/stacks")
    .callThrough()
    .with({ stackCreate });

  try {
    const common = require("@azure/bicep-deploy-common");
    const deployments = require("@azure/bicep-deploy-common/deployments");
    const stacks = require("@azure/bicep-deploy-common/stacks");
    const rpc = require("@azure/bicep-rpc-client");

    assert.equal(typeof common.execute, "function");
    assert.equal(typeof deployments.deploymentCreate, "function");
    assert.equal(typeof stacks.stackCreate, "function");
    assert.equal(typeof rpc.Bicep, "function");

    await common.execute(
      {
        ...commonConfig,
        type: "deployment",
        operation: "create",
        whatIf: {},
      },
      logger,
      outputSetter,
      bicepCache,
    );
    await common.execute(
      {
        ...commonConfig,
        type: "deploymentStack",
        operation: "create",
        actionOnUnManage: { resources: "detach" },
        denySettings: { mode: "none" },
        bypassStackOutOfSyncError: false,
      },
      logger,
      outputSetter,
      bicepCache,
    );

    assert.equal(
      deploymentCreateCalls,
      1,
      "execute() should call the deployment mock through the public subpath",
    );
    assert.equal(
      stackCreateCalls,
      1,
      "execute() should call the stack mock through the public subpath",
    );
  } finally {
    rewiremock.disable();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
