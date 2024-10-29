// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { parse } from "yaml";
import * as process from "process";

const mockCore = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  getInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
};

jest.mock("@actions/core", () => mockCore);

type ActionResult = {
  outputs: Record<string, unknown>;
  errors: string[];
  failure?: string;
};

function configureMocks(inputYaml: string) {
  const yamlInputs = parse(inputYaml);
  const result: ActionResult = { outputs: {}, errors: [] };

  mockCore.getInput.mockImplementation(inputName => {
    const value = yamlInputs[inputName];
    if (value === undefined) {
      return "";
    }

    if (typeof value !== "string") {
      throw new Error(
        `Only string values are supported (parsing ${inputName})`,
      );
    }

    return value.trim();
  });

  mockCore.setOutput.mockImplementation((name, value) => {
    result.outputs[name] = value;
  });

  mockCore.setFailed.mockImplementation(message => {
    console.error(`setFailed: ${message}`);
    result.failure = message;
  });

  mockCore.info.mockImplementation(message => console.info(message));
  mockCore.warning.mockImplementation(message => console.warn(message));
  mockCore.error.mockImplementation(message => {
    result.errors.push(removeColors(message));
    console.error(message);
  });

  return result;
}

import { run } from "../src/main";
import { removeColors } from "../src/helpers/logging";

type EnvironmentData = {
  subscriptionId: string;
  resourceGroup: string;
};

export async function runAction(getYaml: (data: EnvironmentData) => string) {
  expect(process.env.LIVETEST_SUBSCRIPTION_ID).toBeDefined();
  expect(process.env.LIVETEST_RESOURCE_GROUP).toBeDefined();

  const data: EnvironmentData = {
    subscriptionId: process.env.LIVETEST_SUBSCRIPTION_ID!,
    resourceGroup: process.env.LIVETEST_RESOURCE_GROUP!,
  };

  const result = configureMocks(getYaml(data));

  await run();

  return result;
}
