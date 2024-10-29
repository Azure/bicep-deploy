// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  Bicep,
  CompileParamsRequest,
  CompileParamsResponse,
  CompileRequest,
  CompileResponse,
} from "bicep-node";

const mockBicep: Partial<jest.MockedObjectDeep<Bicep>> = {
  compile: jest.fn(),
  compileParams: jest.fn(),
  version: jest.fn().mockReturnValue("1.2.3"),
  dispose: jest.fn(),
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
    install: jest.fn().mockResolvedValue(Promise.resolve("/path/to/bicep")),
    initialize: jest.fn().mockResolvedValue(mockBicep),
  },
};

jest.mock("bicep-node", () => mockBicepNode);
