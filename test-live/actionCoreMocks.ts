// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as yaml from "yaml";
import { removeColors } from "../packages/bicep-deploy-common/src/logging";

const mockCore = {
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  isDebug: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
};

vi.mock("@actions/core", () => mockCore);

type ActionResult = {
  outputs: Record<string, unknown>;
  errors: string[];
  failure?: string;
};

export function configureMocks(inputYaml: string) {
  const yamlInputs = yaml.parse(inputYaml);
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
