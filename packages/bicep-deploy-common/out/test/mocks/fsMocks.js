"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureReadFile = configureReadFile;
const mockFsPromises = {
    readFile: jest.fn(),
    mkdtemp: jest.fn(),
};
function configureReadFile(mock) {
    mockFsPromises.readFile.mockImplementation(filePath => Promise.resolve(mock(filePath)));
}
jest.mock("fs/promises", () => mockFsPromises);
//# sourceMappingURL=fsMocks.js.map