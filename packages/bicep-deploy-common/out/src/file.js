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
exports.getJsonParameters = getJsonParameters;
exports.getTemplateAndParameters = getTemplateAndParameters;
exports.parse = parse;
exports.resolvePath = resolvePath;
/* eslint-disable prettier/prettier */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const bicep_node_1 = require("bicep-node");
async function installBicep(bicepVersion) {
    const bicepTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bicep-"));
    return await bicep_node_1.Bicep.install(bicepTmpDir, bicepVersion);
}
async function compileBicepParams(paramFilePath, logger, parameters, bicepVersion) {
    const bicepPath = await installBicep(bicepVersion);
    const result = await withBicep(bicepPath, bicep => bicep.compileParams({
        path: paramFilePath,
        parameterOverrides: parameters ?? {},
    }), logger);
    logDiagnostics(result.diagnostics, logger);
    if (!result.success) {
        throw `Failed to compile Bicep parameters file: ${paramFilePath}`;
    }
    return {
        parameters: result.parameters,
        template: result.template,
        templateSpecId: result.templateSpecId,
    };
}
async function compileBicep(templateFilePath, logger, bicepVersion) {
    const bicepPath = await installBicep(bicepVersion);
    const result = await withBicep(bicepPath, bicep => bicep.compile({
        path: templateFilePath,
    }), logger);
    logDiagnostics(result.diagnostics, logger);
    if (!result.success) {
        throw `Failed to compile Bicep file: ${templateFilePath}`;
    }
    return { template: result.contents };
}
async function getJsonParameters(config) {
    const { parametersFile, parameters } = config;
    const contents = parametersFile
        ? JSON.parse(await fs.readFile(parametersFile, "utf8"))
        : { parameters: {} };
    for (const [key, value] of Object.entries(parameters ?? {})) {
        contents["parameters"][key] = { value };
    }
    return JSON.stringify(contents);
}
async function getTemplateAndParameters(config, logger) {
    const { parametersFile, templateFile } = config;
    if (parametersFile &&
        path.extname(parametersFile).toLowerCase() === ".bicepparam") {
        return parse(await compileBicepParams(parametersFile, logger, config.parameters, config.bicepVersion));
    }
    if (parametersFile &&
        path.extname(parametersFile).toLowerCase() !== ".json") {
        throw new Error(`Unsupported parameters file type: ${parametersFile}`);
    }
    const parameters = await getJsonParameters(config);
    if (templateFile && path.extname(templateFile).toLowerCase() === ".bicep") {
        const { template } = await compileBicep(templateFile, logger, config.bicepVersion);
        return parse({ template, parameters });
    }
    if (templateFile && path.extname(templateFile).toLowerCase() !== ".json") {
        throw new Error(`Unsupported template file type: ${templateFile}`);
    }
    if (!templateFile) {
        throw new Error("Template file is required");
    }
    const template = await fs.readFile(templateFile, "utf8");
    return parse({ template, parameters });
}
function parse(input) {
    const { parameters, template, templateSpecId } = input;
    const parametersContents = parameters ? JSON.parse(parameters) : undefined;
    const templateContents = template ? JSON.parse(template) : undefined;
    return { parametersContents, templateContents, templateSpecId };
}
async function withBicep(bicepPath, action, logger) {
    const bicep = await bicep_node_1.Bicep.initialize(bicepPath);
    try {
        const version = await bicep.version();
        logger.logInfo(`Installed Bicep version ${version} to ${bicepPath}`);
        return await action(bicep);
    }
    finally {
        bicep.dispose();
    }
}
function resolvePath(fileName) {
    return path.resolve(fileName);
}
function logDiagnostics(diagnostics, logger) {
    for (const diag of diagnostics) {
        const message = `${diag.source}(${diag.range.start.line + 1},${diag.range.start.char + 1}) : ${diag.level} ${diag.code}: ${diag.message}`;
        if (diag.level === "Error")
            logger.logError(message);
        if (diag.level === "Warning")
            logger.logWarning(message);
        if (diag.level === "Info")
            logger.logInfo(message);
    }
}
//# sourceMappingURL=file.js.map