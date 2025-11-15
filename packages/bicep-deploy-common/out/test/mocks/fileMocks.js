"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockFile = void 0;
exports.mockFile = {
    getTemplateAndParameters: jest.fn(),
    resolvePath: jest.fn(),
};
jest.mock("../../src/file.ts", () => exports.mockFile);
//# sourceMappingURL=fileMocks.js.map