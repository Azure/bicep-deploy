// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import yaml from "yaml";

import { InputReader } from "../../src/input";

export class mockInputReader implements InputReader {
  getInput = jest.fn();
}

export function configureGetInputMock(
  inputs: Record<string, string>,
  inputReader: mockInputReader,
) {
  inputReader.getInput.mockImplementation(inputName => {
    return inputs[inputName];
  });
}

export function configureGetInputMockWithYaml(
  yamlInput: string,
  inputReader: mockInputReader,
) {
  configureGetInputMock(yaml.parse(yamlInput), inputReader);
}
