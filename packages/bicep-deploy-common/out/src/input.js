"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredStringInput = getRequiredStringInput;
exports.getOptionalStringInput = getOptionalStringInput;
exports.getRequiredEnumInput = getRequiredEnumInput;
exports.getOptionalEnumInput = getOptionalEnumInput;
exports.getOptionalFilePath = getOptionalFilePath;
exports.getOptionalBooleanInput = getOptionalBooleanInput;
exports.getOptionalStringArrayInput = getOptionalStringArrayInput;
exports.getOptionalEnumArrayInput = getOptionalEnumArrayInput;
exports.getOptionalDictionaryInput = getOptionalDictionaryInput;
exports.getOptionalStringDictionaryInput = getOptionalStringDictionaryInput;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const yaml = __importStar(require("yaml"));
const file_1 = require("./file");
function getRequiredStringInput(inputName, inputReader) {
    return getInput(inputName, inputReader, undefined, true);
}
function getOptionalStringInput(inputName, inputReader) {
    return getInput(inputName, inputReader, undefined, false);
}
function getRequiredEnumInput(inputName, allowedValues, inputReader) {
    return getInput(inputName, inputReader, allowedValues, true);
}
function getOptionalEnumInput(inputName, allowedValues, inputReader) {
    return getInput(inputName, inputReader, allowedValues, false);
}
function getOptionalFilePath(inputName, inputReader) {
    const input = getOptionalStringInput(inputName, inputReader);
    if (!input) {
        return;
    }
    return (0, file_1.resolvePath)(input);
}
function getOptionalBooleanInput(inputName, inputReader) {
    const input = getOptionalStringInput(inputName, inputReader);
    if (!input) {
        return false;
    }
    if (input.toLowerCase() === "true") {
        return true;
    }
    else if (input.toLowerCase() === "false") {
        return false;
    }
    else {
        throw new Error(`Action input '${inputName}' must be a boolean value`);
    }
}
function getOptionalStringArrayInput(inputName, inputReader) {
    const inputString = getOptionalStringInput(inputName, inputReader);
    return inputString ? parseCommaSeparated(inputString) : undefined;
}
function getOptionalEnumArrayInput(inputName, allowedValues, inputReader) {
    const values = getOptionalStringArrayInput(inputName, inputReader);
    if (!values) {
        return undefined;
    }
    const allowedValuesString = allowedValues;
    for (const value of values) {
        if (allowedValuesString.indexOf(value) === -1) {
            throw new Error(`Action input '${inputName}' must be one of the following values: '${allowedValues.join(`', '`)}'`);
        }
    }
    return values;
}
function getOptionalDictionaryInput(inputName, inputReader) {
    const inputString = getOptionalStringInput(inputName, inputReader);
    if (!inputString) {
        return undefined;
    }
    const input = tryParseJson(inputString) ?? tryParseYaml(inputString);
    if (typeof input !== "object") {
        throw new Error(`Action input '${inputName}' must be a valid JSON or YAML object`);
    }
    return input;
}
function getOptionalStringDictionaryInput(inputName, inputReader) {
    const input = getOptionalDictionaryInput(inputName, inputReader);
    if (!input) {
        return undefined;
    }
    Object.keys(input).forEach(key => {
        if (typeof input[key] !== "string") {
            throw new Error(`Action input '${inputName}' must be a valid JSON or YAML object containing only string values`);
        }
    });
    return input;
}
function tryParseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return undefined;
    }
}
function tryParseYaml(value) {
    try {
        return yaml.parse(value);
    }
    catch {
        return undefined;
    }
}
function parseCommaSeparated(value) {
    return value
        .split(",")
        .map(val => val.trim())
        .filter(val => val.length > 0);
}
function getInput(inputName, inputReader, allowedValues, throwOnMissing = true) {
    const inputValue = inputReader.getInput(inputName)?.trim();
    if (!inputValue) {
        if (throwOnMissing) {
            throw new Error(`Action input '${inputName}' is required but not provided`);
        }
        else {
            return;
        }
    }
    if (allowedValues && !allowedValues.includes(inputValue)) {
        throw new Error(`Action input '${inputName}' must be one of the following values: '${allowedValues.join(`', '`)}'`);
    }
    return inputValue;
}
//# sourceMappingURL=input.js.map