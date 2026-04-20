// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const mockFsPromises = {
  readFile: vi.fn(),
  mkdtemp: vi.fn(),
};

const existsSyncMock = vi.fn().mockReturnValue(true);

export function configureReadFile(mock: (filePath: string) => string) {
  mockFsPromises.readFile.mockImplementation(filePath =>
    Promise.resolve(mock(filePath)),
  );
  existsSyncMock.mockReturnValue(true);
}

export function configureExistsSync(returnValue: boolean) {
  existsSyncMock.mockReturnValue(returnValue);
}

vi.mock("fs/promises", () => mockFsPromises);
vi.mock("fs", async importOriginal => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: existsSyncMock,
    },
  };
});
