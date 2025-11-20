// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  Bicep,
  CompileParamsRequest,
  CompileParamsResponse,
  CompileRequest,
  CompileResponse,
} from "bicep-node";

const mockBicep: Partial<vi.MockedObjectDeep<Bicep>> = {
  compile: vi.fn(),
  compileParams: vi.fn(),
  version: vi.fn().mockReturnValue("1.2.3"),
  dispose: vi.fn(),
};

export function configureCompileMock(
  mock: (request: CompileRequest) => CompileResponse,
) {
  mockBicep.compile!.mockImplementation(req => Promise.resolve(mock(req)));
}

export function configureCompileParamsMock(
  mock: (request: CompileParamsRequest) => CompileParamsResponse,
) {
  mockBicep.compileParams!.mockImplementation(req =>
    Promise.resolve(mock(req)),
  );
}

const mockBicepNode = {
  Bicep: {
    install: vi.fn().mockResolvedValue(Promise.resolve("/path/to/bicep")),
    initialize: vi.fn().mockResolvedValue(mockBicep),
  },
};

export function configureBicepInstallMock(
  mock: (tmpDir: string, version?: string) => Promise<string>,
) {
  mockBicepNode.Bicep.install.mockImplementation(mock);
}

vi.mock("bicep-node", () => mockBicepNode);
