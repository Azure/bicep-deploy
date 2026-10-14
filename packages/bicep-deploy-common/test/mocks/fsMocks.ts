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
  // Default existsSync to "true" only for paths the test actually knows about (i.e. paths for
  // which `mock` doesn't throw), so unrelated lookups - like configChain.ts walking up parent
  // directories looking for a bicepconfig.json - don't spuriously "find" a file the test never
  // configured a readFile response for.
  existsSyncMock.mockImplementation(filePath => {
    try {
      mock(filePath);
      return true;
    } catch {
      return false;
    }
  });
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
