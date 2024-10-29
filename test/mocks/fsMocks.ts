// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const mockFsPromises = {
  readFile: jest.fn(),
};

export function configureReadFile(mock: (filePath: string) => string) {
  mockFsPromises.readFile.mockImplementation(filePath =>
    Promise.resolve(mock(filePath)),
  );
}

jest.mock("fs/promises", () => mockFsPromises);
