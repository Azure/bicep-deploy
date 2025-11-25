// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
export const mockFile = {
  getTemplateAndParameters: vi.fn(),
  resolvePath: vi.fn(),
};

vi.mock("../../src/file.ts", () => mockFile);
