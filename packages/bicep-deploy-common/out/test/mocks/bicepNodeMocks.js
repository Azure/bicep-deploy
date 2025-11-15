"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureCompileMock = configureCompileMock;
exports.configureCompileParamsMock = configureCompileParamsMock;
exports.configureBicepInstallMock = configureBicepInstallMock;
const mockBicep = {
    compile: jest.fn(),
    compileParams: jest.fn(),
    version: jest.fn().mockReturnValue("1.2.3"),
    dispose: jest.fn(),
};
function configureCompileMock(mock) {
    mockBicep.compile.mockImplementation(req => Promise.resolve(mock(req)));
}
function configureCompileParamsMock(mock) {
    mockBicep.compileParams.mockImplementation(req => Promise.resolve(mock(req)));
}
const mockBicepNode = {
    Bicep: {
        install: jest.fn().mockResolvedValue(Promise.resolve("/path/to/bicep")),
        initialize: jest.fn().mockResolvedValue(mockBicep),
    },
};
function configureBicepInstallMock(mock) {
    mockBicepNode.Bicep.install.mockImplementation(mock);
}
jest.mock("bicep-node", () => mockBicepNode);
//# sourceMappingURL=bicepNodeMocks.js.map