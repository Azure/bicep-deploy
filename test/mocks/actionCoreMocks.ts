// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
export const mockActionsCore = {
  info: jest.fn().mockImplementation(console.info),
  warning: jest.fn().mockImplementation(console.warn),
  error: jest.fn().mockImplementation(console.error),
  getInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  setSecret: jest.fn(),
};

jest.mock("@actions/core", () => mockActionsCore);

export function configureGetInputMock(inputs: Record<string, string>) {
  mockActionsCore.getInput.mockImplementation(inputName => {
    return inputs[inputName];
  });
}
