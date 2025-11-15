"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const bicepNodeMocks_1 = require("./mocks/bicepNodeMocks");
const fsMocks_1 = require("./mocks/fsMocks");
const logging_1 = require("./logging");
const file_1 = require("../src/file");
const utils_1 = require("./utils");
describe("file parsing", () => {
    it("reads and parses template and parameters files", async () => {
        const config = {
            templateFile: "/path/to/template.json",
            parametersFile: "/path/to/parameters.json",
        };
        (0, fsMocks_1.configureReadFile)(filePath => {
            if (filePath === "/path/to/template.json")
                return (0, utils_1.readTestFile)("files/basic/main.json");
            if (filePath === "/path/to/parameters.json")
                return (0, utils_1.readTestFile)("files/basic/main.parameters.json");
            throw `Unexpected file path: ${filePath}`;
        });
        const logger = new logging_1.TestLogger();
        const { templateContents, parametersContents } = await (0, file_1.getTemplateAndParameters)(config, logger);
        expect(templateContents["$schema"]).toBe("https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#");
        expect(templateContents["parameters"]["stringParam"]).toBeDefined();
        expect(parametersContents["$schema"]).toBe("https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#");
        expect(parametersContents["parameters"]["stringParam"]).toBeDefined();
    });
    it("compiles Bicepparam files", async () => {
        const config = {
            parametersFile: "/path/to/main.bicepparam",
            parameters: {
                overrideMe: "foo",
            },
        };
        (0, bicepNodeMocks_1.configureBicepInstallMock)((tmpDir, version) => {
            expect(version).toBeUndefined();
            return Promise.resolve("/path/to/bicep");
        });
        (0, bicepNodeMocks_1.configureCompileParamsMock)(req => {
            expect(req).toStrictEqual({
                path: "/path/to/main.bicepparam",
                parameterOverrides: { overrideMe: "foo" },
            });
            return {
                success: true,
                diagnostics: [],
                template: (0, utils_1.readTestFile)("files/basic/main.json"),
                parameters: (0, utils_1.readTestFile)("files/basic/main.parameters.json"),
            };
        });
        const logger = new logging_1.TestLogger();
        const { templateContents, parametersContents } = await (0, file_1.getTemplateAndParameters)(config, logger);
        expect(templateContents["$schema"]).toBe("https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#");
        expect(templateContents["parameters"]["stringParam"]).toBeDefined();
        expect(parametersContents["$schema"]).toBe("https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#");
        expect(parametersContents["parameters"]["stringParam"]).toBeDefined();
    });
    it("compiles Bicep files", async () => {
        const config = {
            parametersFile: "/path/to/parameters.json",
            templateFile: "/path/to/main.bicep",
        };
        (0, fsMocks_1.configureReadFile)(filePath => {
            if (filePath === "/path/to/parameters.json")
                return (0, utils_1.readTestFile)("files/basic/main.parameters.json");
            throw `Unexpected file path: ${filePath}`;
        });
        (0, bicepNodeMocks_1.configureBicepInstallMock)((tmpDir, version) => {
            expect(version).toBeUndefined();
            return Promise.resolve("/path/to/bicep");
        });
        (0, bicepNodeMocks_1.configureCompileMock)(req => {
            expect(req).toStrictEqual({
                path: "/path/to/main.bicep",
            });
            return {
                success: true,
                diagnostics: [],
                contents: (0, utils_1.readTestFile)("files/basic/main.json"),
            };
        });
        const logger = new logging_1.TestLogger();
        const { templateContents, parametersContents } = await (0, file_1.getTemplateAndParameters)(config, logger);
        expect(templateContents["$schema"]).toBe("https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#");
        expect(templateContents["parameters"]["stringParam"]).toBeDefined();
        expect(parametersContents["$schema"]).toBe("https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#");
        expect(parametersContents["parameters"]["stringParam"]).toBeDefined();
    });
    it("compiles Bicep files with specific version", async () => {
        const config = {
            parametersFile: "/path/to/parameters.json",
            templateFile: "/path/to/main.bicep",
            bicepVersion: "0.37.4",
        };
        (0, fsMocks_1.configureReadFile)(filePath => {
            if (filePath === "/path/to/parameters.json")
                return (0, utils_1.readTestFile)("files/basic/main.parameters.json");
            throw `Unexpected file path: ${filePath}`;
        });
        // Mock the Bicep.install to verify it's called with the specific version
        (0, bicepNodeMocks_1.configureBicepInstallMock)((tmpDir, version) => {
            expect(version).toBe("0.37.4");
            return Promise.resolve("/path/to/bicep");
        });
        (0, bicepNodeMocks_1.configureCompileMock)(req => {
            expect(req).toStrictEqual({
                path: "/path/to/main.bicep",
            });
            return {
                success: true,
                diagnostics: [],
                contents: (0, utils_1.readTestFile)("files/basic/main.json"),
            };
        });
        const logger = new logging_1.TestLogger();
        const { templateContents, parametersContents } = await (0, file_1.getTemplateAndParameters)(config, logger);
        expect(templateContents["$schema"]).toBe("https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#");
        expect(templateContents["parameters"]["stringParam"]).toBeDefined();
        expect(parametersContents["$schema"]).toBe("https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#");
        expect(parametersContents["parameters"]["stringParam"]).toBeDefined();
    });
    it("blocks unexpected parameter file extensions", async () => {
        const config = {
            parametersFile: "/path/to/parameters.what",
            templateFile: "/path/to/main.json",
        };
        const logger = new logging_1.TestLogger();
        await expect(async () => await (0, file_1.getTemplateAndParameters)(config, logger)).rejects.toThrow("Unsupported parameters file type: /path/to/parameters.what");
    });
    it("blocks unexpected template file extension", async () => {
        const config = {
            parametersFile: "/path/to/parameters.json",
            templateFile: "/path/to/main.what",
        };
        const logger = new logging_1.TestLogger();
        await expect(async () => await (0, file_1.getTemplateAndParameters)(config, logger)).rejects.toThrow("Unsupported template file type: /path/to/main.what");
    });
});
describe("file parsing with parameters", () => {
    it("accepts parameter overrides", async () => {
        (0, fsMocks_1.configureReadFile)(filePath => {
            if (filePath === "/parameters.json")
                return (0, utils_1.readTestFile)("files/basic/main.parameters.json");
            throw `Unexpected file path: ${filePath}`;
        });
        const parameters = await (0, file_1.getJsonParameters)({
            parametersFile: "/parameters.json",
            parameters: {
                objectParam: "this param has been overridden!",
            },
        });
        expect(JSON.parse(parameters).parameters).toStrictEqual({
            intParam: {
                value: 42,
            },
            objectParam: {
                value: "this param has been overridden!",
            },
            stringParam: {
                value: "hello world",
            },
        });
    });
    it("can override missing parameters", async () => {
        (0, fsMocks_1.configureReadFile)(filePath => {
            if (filePath === "/parameters.json")
                return JSON.stringify({ parameters: {} });
            throw `Unexpected file path: ${filePath}`;
        });
        const parameters = await (0, file_1.getJsonParameters)({
            parametersFile: "/parameters.json",
            parameters: {
                objectParam: "this param has been overridden!",
            },
        });
        expect(JSON.parse(parameters).parameters).toStrictEqual({
            objectParam: {
                value: "this param has been overridden!",
            },
        });
    });
    it("works without a parameters file", async () => {
        const parameters = await (0, file_1.getJsonParameters)({
            parameters: {
                objectParam: "this param has been overridden!",
            },
        });
        expect(JSON.parse(parameters).parameters).toStrictEqual({
            objectParam: {
                value: "this param has been overridden!",
            },
        });
    });
});
//# sourceMappingURL=file.test.js.map