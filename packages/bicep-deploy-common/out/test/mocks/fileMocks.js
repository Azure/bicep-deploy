"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockFile = void 0;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
exports.mockFile = {
    getTemplateAndParameters: jest.fn(),
    resolvePath: jest.fn(),
};
jest.mock("../../src/file.ts", () => exports.mockFile);
//# sourceMappingURL=fileMocks.js.map