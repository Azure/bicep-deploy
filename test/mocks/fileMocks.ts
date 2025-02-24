// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export const mockFile = {
  getTemplateAndParameters: jest.fn(),
  resolvePath: jest.fn(),
};

jest.mock("../../src/helpers/file.ts", () => mockFile);
