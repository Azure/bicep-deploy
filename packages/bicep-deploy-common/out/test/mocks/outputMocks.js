"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockOutputSetter = void 0;
class mockOutputSetter {
    constructor() {
        this.setOutput = jest.fn();
        this.setFailed = jest.fn();
        this.setSecret = jest.fn();
    }
}
exports.mockOutputSetter = mockOutputSetter;
//# sourceMappingURL=outputMocks.js.map