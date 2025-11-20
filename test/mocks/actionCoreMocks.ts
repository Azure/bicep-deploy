// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
export const mockActionsCore = {
  info: vi.fn().mockImplementation(console.info),
  warning: vi.fn().mockImplementation(console.warn),
  error: vi.fn().mockImplementation(console.error),
  debug: vi.fn().mockImplementation(console.debug),
  getInput: vi.fn(),
  isDebug: vi.fn().mockImplementation(() => true),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  setSecret: vi.fn(),
};

vi.mock("@actions/core", () => mockActionsCore);

export function configureGetInputMock(inputs: Record<string, string>) {
  mockActionsCore.getInput.mockImplementation(inputName => {
    return inputs[inputName];
  });
}
