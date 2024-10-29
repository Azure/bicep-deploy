// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  configureCompileMock,
  configureCompileParamsMock,
} from "./mocks/bicepNodeMocks";
import { configureReadFile } from "./mocks/fsMocks";
import { FileConfig } from "../src/config";
import {
  getJsonParameters,
  getTemplateAndParameters,
} from "../src/helpers/file";
import { readTestFile } from "./utils";

describe("file parsing", () => {
  it("reads and parses template and parameters files", async () => {
    const config: FileConfig = {
      templateFile: "/path/to/template.json",
      parametersFile: "/path/to/parameters.json",
    };

    configureReadFile(filePath => {
      if (filePath === "/path/to/template.json")
        return readTestFile("files/basic/main.json");
      if (filePath === "/path/to/parameters.json")
        return readTestFile("files/basic/main.parameters.json");
      throw `Unexpected file path: ${filePath}`;
    });

    const { templateContents, parametersContents } =
      await getTemplateAndParameters(config);

    expect(templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(templateContents["parameters"]["stringParam"]).toBeDefined();

    expect(parametersContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    );
    expect(parametersContents["parameters"]["stringParam"]).toBeDefined();
  });

  it("compiles Bicepparam files", async () => {
    const config: FileConfig = {
      parametersFile: "/path/to/main.bicepparam",
      parameters: {
        overrideMe: "foo",
      },
    };

    configureCompileParamsMock(req => {
      expect(req).toStrictEqual({
        path: "/path/to/main.bicepparam",
        parameterOverrides: { overrideMe: "foo" },
      });

      return {
        success: true,
        diagnostics: [],
        template: readTestFile("files/basic/main.json"),
        parameters: readTestFile("files/basic/main.parameters.json"),
      };
    });

    const { templateContents, parametersContents } =
      await getTemplateAndParameters(config);

    expect(templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(templateContents["parameters"]["stringParam"]).toBeDefined();

    expect(parametersContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    );
    expect(parametersContents["parameters"]["stringParam"]).toBeDefined();
  });

  it("compiles Bicep files", async () => {
    const config: FileConfig = {
      parametersFile: "/path/to/parameters.json",
      templateFile: "/path/to/main.bicep",
    };

    configureReadFile(filePath => {
      if (filePath === "/path/to/parameters.json")
        return readTestFile("files/basic/main.parameters.json");
      throw `Unexpected file path: ${filePath}`;
    });

    configureCompileMock(req => {
      expect(req).toStrictEqual({
        path: "/path/to/main.bicep",
      });

      return {
        success: true,
        diagnostics: [],
        contents: readTestFile("files/basic/main.json"),
      };
    });

    const { templateContents, parametersContents } =
      await getTemplateAndParameters(config);

    expect(templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(templateContents["parameters"]["stringParam"]).toBeDefined();

    expect(parametersContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    );
    expect(parametersContents["parameters"]["stringParam"]).toBeDefined();
  });

  it("blocks unexpected parameter file extensions", async () => {
    const config: FileConfig = {
      parametersFile: "/path/to/parameters.what",
      templateFile: "/path/to/main.json",
    };

    expect(async () => await getTemplateAndParameters(config)).rejects.toThrow(
      "Unsupported parameters file type: /path/to/parameters.what",
    );
  });

  it("blocks unexpected template file extension", async () => {
    const config: FileConfig = {
      parametersFile: "/path/to/parameters.json",
      templateFile: "/path/to/main.what",
    };

    expect(async () => await getTemplateAndParameters(config)).rejects.toThrow(
      "Unsupported template file type: /path/to/main.what",
    );
  });
});

describe("file parsing with parameters", () => {
  it("accepts parameter overrides", async () => {
    configureReadFile(filePath => {
      if (filePath === "/parameters.json")
        return readTestFile("files/basic/main.parameters.json");
      throw `Unexpected file path: ${filePath}`;
    });

    const parameters = await getJsonParameters({
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
    configureReadFile(filePath => {
      if (filePath === "/parameters.json")
        return JSON.stringify({ parameters: {} });
      throw `Unexpected file path: ${filePath}`;
    });

    const parameters = await getJsonParameters({
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
    const parameters = await getJsonParameters({
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
