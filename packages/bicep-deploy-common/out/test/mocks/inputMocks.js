"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockInputReader = void 0;
exports.configureGetInputMock = configureGetInputMock;
exports.configureGetInputMockWithYaml = configureGetInputMockWithYaml;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const yaml_1 = __importDefault(require("yaml"));
class mockInputReader {
    constructor() {
        this.getInput = jest.fn();
    }
}
exports.mockInputReader = mockInputReader;
function configureGetInputMock(inputs, inputReader) {
    inputReader.getInput.mockImplementation(inputName => {
        return inputs[inputName];
    });
}
function configureGetInputMockWithYaml(yamlInput, inputReader) {
    configureGetInputMock(yaml_1.default.parse(yamlInput), inputReader);
}
//# sourceMappingURL=inputMocks.js.map