// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  Bicep,
  CompileParamsRequest,
  CompileParamsResponse,
  CompileRequest,
  CompileResponse,
} from "@azure/bicep-rpc-client";
import type { MockedObjectDeep } from "@vitest/spy";

const mockBicep: Partial<MockedObjectDeep<Bicep>> = {
  compile: vi.fn(),
  compileParams: vi.fn(),
  version: vi.fn().mockReturnValue("1.2.3"),
  dispose: vi.fn(),
};

export function configureCompileMock(
  mock: (request: CompileRequest) => CompileResponse,
) {
  mockBicep.compile!.mockImplementation((req: CompileRequest) =>
    Promise.resolve(mock(req)),
  );
}

export function configureCompileParamsMock(
  mock: (request: CompileParamsRequest) => CompileParamsResponse,
) {
  mockBicep.compileParams!.mockImplementation((req: CompileParamsRequest) =>
    Promise.resolve(mock(req)),
  );
}

const mockBicepNode = {
  Bicep: {
    install: vi.fn().mockResolvedValue(Promise.resolve("/path/to/bicep")),
    initialize: vi.fn().mockResolvedValue(mockBicep),
    getDownloadUrl: vi
      .fn()
      .mockResolvedValue(
        "https://downloads.bicep.azure.com/v1.2.3/bicep-linux-x64",
      ),
  },
};

export function configureBicepInstallMock(
  mock: (tmpDir: string, version?: string) => Promise<string>,
) {
  mockBicepNode.Bicep.install.mockImplementation(mock);
}

export function configureBicepGetDownloadUrlMock(
  mock: (version?: string) => Promise<string>,
) {
  mockBicepNode.Bicep.getDownloadUrl.mockImplementation(mock);
}

vi.mock("@azure/bicep-rpc-client", () => mockBicepNode);
