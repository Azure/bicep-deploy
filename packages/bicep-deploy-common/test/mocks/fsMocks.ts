// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const mockFsPromises = {
  readFile: vi.fn(),
  mkdtemp: vi.fn(),
};

export function configureReadFile(mock: (filePath: string) => string) {
  mockFsPromises.readFile.mockImplementation(filePath =>
    Promise.resolve(mock(filePath)),
  );
}

vi.mock("fs/promises", () => mockFsPromises);
