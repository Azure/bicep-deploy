// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as path from "path";
import {
  configureCompileMock,
  configureCompileParamsMock,
  configureBicepInstallMock,
  configureBicepListReleasesMock,
} from "./mocks/bicepNodeMocks";
import { configureReadFile, configureExistsSync } from "./mocks/fsMocks";
import { FileConfig } from "../src/config";
import { TestLogger } from "./logging";
import {
  getJsonParameters,
  getTemplateAndParameters,
  parse,
} from "../src/file";
import { readTestFile, noopCache } from "./utils";

// Resolves the absolute path of the bicepconfig.json that configChain.ts would look for next to
// `sourceFilePath`, matching path.resolve()/path.join() semantics on the current platform (e.g.
// Windows resolves "/path/to/main.bicep" to "C:\path\to\main.bicep", not "/path/to/main.bicep").
function resolvedConfigPath(sourceFilePath: string) {
  return path.join(
    path.dirname(path.resolve(sourceFilePath)),
    "bicepconfig.json",
  );
}

describe("file parsing", () => {
  it("reads and parses JSON template and parameters files", async () => {
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

    const logger = new TestLogger();

    const { templateContents, parametersContents } =
      await getTemplateAndParameters(config, logger, noopCache);

    expect(templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(templateContents["parameters"]["stringParam"]).toBeDefined();

    expect(parametersContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    );
    expect(parametersContents["parameters"]["stringParam"]).toBeDefined();

    // Validate logging
    const infoLogs = logger.getExternalMessages("repository", "info");
    expect(
      infoLogs.some(log =>
        log.includes("Using parameters file: /path/to/parameters.json"),
      ),
    ).toBe(true);
    expect(
      infoLogs.some(log =>
        log.includes("Using template file: /path/to/template.json"),
      ),
    ).toBe(true);
  });

  it("reads template file without parameters file", async () => {
    const config: FileConfig = {
      templateFile: "/path/to/template.json",
      parametersFile: undefined,
    };

    configureReadFile(filePath => {
      if (filePath === "/path/to/template.json")
        return readTestFile("files/basic/main.json");
      throw `Unexpected file path: ${filePath}`;
    });

    const logger = new TestLogger();

    const { templateContents, parametersContents } =
      await getTemplateAndParameters(config, logger, noopCache);

    expect(templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(templateContents["parameters"]["stringParam"]).toBeDefined();

    expect(parametersContents["parameters"]).toStrictEqual({});

    // Validate logging - only template file should be logged
    const infoLogs = logger.getExternalMessages("repository", "info");
    expect(
      infoLogs.some(log =>
        log.includes("Using template file: /path/to/template.json"),
      ),
    ).toBe(true);
    expect(infoLogs.some(log => log.includes("Using parameters file"))).toBe(
      false,
    );
  });

  it("accepts .jsonc template and parameters files", async () => {
    const config: FileConfig = {
      templateFile: "/path/to/template.jsonc",
      parametersFile: "/path/to/parameters.jsonc",
    };

    configureReadFile(filePath => {
      if (filePath === "/path/to/template.jsonc")
        return readTestFile("files/basic/main.jsonc");
      if (filePath === "/path/to/parameters.jsonc")
        return readTestFile("files/basic/main.parameters.jsonc");
      throw `Unexpected file path: ${filePath}`;
    });

    const logger = new TestLogger();

    const {
      templateContents: parsedTemplate,
      parametersContents: parsedParameters,
    } = await getTemplateAndParameters(config, logger, noopCache);

    expect(parsedTemplate["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(parsedTemplate["parameters"]["stringParam"]).toBeDefined();

    expect(parsedParameters["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    );
    expect(parsedParameters["parameters"]["stringParam"]).toBeDefined();
  });

  it("parses JSONC content containing comments", () => {
    const template = readTestFile("files/basic/main.jsonc");
    const parameters = readTestFile("files/basic/main.parameters.jsonc");
    const parsed = parse({ template, parameters });

    expect(parsed.templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(
      parsed.parametersContents["parameters"]["stringParam"],
    ).toBeDefined();
  });

  it("compiles Bicepparam files", async () => {
    const config: FileConfig = {
      parametersFile: "/path/to/main.bicepparam",
      parameters: {
        overrideMe: "foo",
      },
    };

    configureBicepInstallMock((tmpDir, version) => {
      expect(version).toBe("1.2.3");
      return Promise.resolve("/path/to/bicep");
    });

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

    const logger = new TestLogger();

    const { templateContents, parametersContents } =
      await getTemplateAndParameters(config, logger, noopCache);

    expect(templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(templateContents["parameters"]["stringParam"]).toBeDefined();

    expect(parametersContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    );
    expect(parametersContents["parameters"]["stringParam"]).toBeDefined();

    // Validate logging - bicepparam includes template, so only params file logged
    const infoLogs = logger.getExternalMessages("repository", "info");
    expect(
      infoLogs.some(log =>
        log.includes("Using parameters file: /path/to/main.bicepparam"),
      ),
    ).toBe(true);
    expect(infoLogs.some(log => log.includes("Using template file"))).toBe(
      false,
    );
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

    configureBicepInstallMock((tmpDir, version) => {
      expect(version).toBe("1.2.3");
      return Promise.resolve("/path/to/bicep");
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

    const logger = new TestLogger();

    const { templateContents, parametersContents } =
      await getTemplateAndParameters(config, logger, noopCache);

    expect(templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(templateContents["parameters"]["stringParam"]).toBeDefined();

    expect(parametersContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    );
    expect(parametersContents["parameters"]["stringParam"]).toBeDefined();

    // Validate logging - both template and parameters file should be logged
    const infoLogs = logger.getExternalMessages("repository", "info");
    expect(
      infoLogs.some(log =>
        log.includes("Using template file: /path/to/main.bicep"),
      ),
    ).toBe(true);
    expect(
      infoLogs.some(log =>
        log.includes("Using parameters file: /path/to/parameters.json"),
      ),
    ).toBe(true);
  });

  it("logs Bicep diagnostics as child process output at their severity", async () => {
    const config: FileConfig = {
      templateFile: "/path/to/main.bicep",
    };

    configureBicepInstallMock(async () => "/path/to/bicep");
    configureCompileMock(() => ({
      success: true,
      diagnostics: [
        {
          source: "/path/to/main.bicep",
          range: {
            start: { line: 0, char: 1 },
            end: { line: 0, char: 2 },
          },
          level: "Info",
          code: "BCP001",
          message: "info diagnostic",
        },
        {
          source: "/path/to/main.bicep",
          range: {
            start: { line: 1, char: 2 },
            end: { line: 1, char: 3 },
          },
          level: "Warning",
          code: "BCP002",
          message: "warning diagnostic",
        },
        {
          source: "/path/to/main.bicep",
          range: {
            start: { line: 2, char: 3 },
            end: { line: 2, char: 4 },
          },
          level: "Error",
          code: "BCP003",
          message: "error diagnostic",
        },
      ],
      contents: readTestFile("files/basic/main.json"),
    }));

    const logger = new TestLogger();
    await getTemplateAndParameters(config, logger, noopCache);

    expect(
      logger.externalLogs.filter(log => log.source === "childProcess"),
    ).toEqual([
      {
        message: "/path/to/main.bicep(1,2) : Info BCP001: info diagnostic",
        source: "childProcess",
        level: "info",
      },
      {
        message:
          "/path/to/main.bicep(2,3) : Warning BCP002: warning diagnostic",
        source: "childProcess",
        level: "warning",
      },
      {
        message: "/path/to/main.bicep(3,4) : Error BCP003: error diagnostic",
        source: "childProcess",
        level: "error",
      },
    ]);
  });

  it("compiles Bicep files with specific version", async () => {
    const config: FileConfig = {
      parametersFile: "/path/to/parameters.json",
      templateFile: "/path/to/main.bicep",
      bicepVersion: "0.37.4",
    };

    configureReadFile(filePath => {
      if (filePath === "/path/to/parameters.json")
        return readTestFile("files/basic/main.parameters.json");
      throw `Unexpected file path: ${filePath}`;
    });

    // Mock the Bicep.install to verify it's called with the specific version
    configureBicepInstallMock((tmpDir, version) => {
      expect(version).toBe("0.37.4");
      return Promise.resolve("/path/to/bicep");
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

    const logger = new TestLogger();

    const { templateContents, parametersContents } =
      await getTemplateAndParameters(config, logger, noopCache);

    expect(templateContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    );
    expect(templateContents["parameters"]["stringParam"]).toBeDefined();

    expect(parametersContents["$schema"]).toBe(
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
    );
    expect(parametersContents["parameters"]["stringParam"]).toBeDefined();
  });

  describe("config chain version resolution", () => {
    const sourceFile = "/path/to/main.bicep";
    const configPath = resolvedConfigPath(sourceFile);
    const constraint = ">=1.2.0, <1.3.0";

    it("resolves version from config chain when no explicit version is given", async () => {
      const config: FileConfig = {
        templateFile: sourceFile,
      };

      configureReadFile(filePath => {
        if (filePath === configPath)
          return JSON.stringify({ bicep: { version: constraint } });
        throw `Unexpected file path: ${filePath}`;
      });

      configureBicepListReleasesMock(["1.2.0", "1.2.5", "1.3.0"]);

      configureBicepInstallMock((tmpDir, version) => {
        expect(version).toBe("1.2.5");
        return Promise.resolve("/path/to/bicep");
      });

      configureCompileMock(() => ({
        success: true,
        diagnostics: [],
        contents: readTestFile("files/basic/main.json"),
      }));

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, noopCache);

      const configChainLogs = logger.getExternalMessages("repository", "info");
      expect(
        configChainLogs.some(log =>
          log.includes(
            `Resolved Bicep version 1.2.5 to satisfy the "bicep.version" constraint "${constraint}" declared in ${configPath}`,
          ),
        ),
      ).toBe(true);
    });

    it("resolves an exact version pin directly without consulting the release list", async () => {
      const config: FileConfig = {
        templateFile: sourceFile,
      };
      const exactPin = "0.24.24";

      configureReadFile(filePath => {
        if (filePath === configPath)
          return JSON.stringify({ bicep: { version: exactPin } });
        throw `Unexpected file path: ${filePath}`;
      });

      // The release list only contains the most recent releases, so an older exact pin like
      // "0.24.24" would never be found there - the fast path below must bypass it entirely.
      const listReleasesSpy = configureBicepListReleasesMock([
        "1.2.0",
        "1.2.5",
        "1.3.0",
      ]);

      configureBicepInstallMock((tmpDir, version) => {
        expect(version).toBe(exactPin);
        return Promise.resolve("/path/to/bicep");
      });

      configureCompileMock(() => ({
        success: true,
        diagnostics: [],
        contents: readTestFile("files/basic/main.json"),
      }));

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, noopCache);

      expect(listReleasesSpy).not.toHaveBeenCalled();

      const configChainLogs = logger.getExternalMessages("repository", "info");
      expect(
        configChainLogs.some(log =>
          log.includes(
            `Resolved Bicep version ${exactPin} to satisfy the "bicep.version" constraint "${exactPin}" declared in ${configPath}`,
          ),
        ),
      ).toBe(true);
    });

    it("uses the explicit version when it satisfies the config chain constraint", async () => {
      const config: FileConfig = {
        templateFile: sourceFile,
        bicepVersion: "1.2.5",
      };

      configureReadFile(filePath => {
        if (filePath === configPath)
          return JSON.stringify({ bicep: { version: constraint } });
        throw `Unexpected file path: ${filePath}`;
      });

      configureBicepInstallMock((tmpDir, version) => {
        expect(version).toBe("1.2.5");
        return Promise.resolve("/path/to/bicep");
      });

      configureCompileMock(() => ({
        success: true,
        diagnostics: [],
        contents: readTestFile("files/basic/main.json"),
      }));

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, noopCache);
    });

    it("throws when the explicit version conflicts with the config chain constraint", async () => {
      const config: FileConfig = {
        templateFile: sourceFile,
        bicepVersion: "2.0.0",
      };

      configureReadFile(filePath => {
        if (filePath === configPath)
          return JSON.stringify({ bicep: { version: constraint } });
        throw `Unexpected file path: ${filePath}`;
      });

      const logger = new TestLogger();

      await expect(
        async () => await getTemplateAndParameters(config, logger, noopCache),
      ).rejects.toThrow(
        `The requested Bicep version "2.0.0" does not satisfy the "bicep.version" constraint "${constraint}" declared in ${configPath}.`,
      );
    });

    it("logs a warning and skips validation when the explicit version is not parseable", async () => {
      const config: FileConfig = {
        templateFile: sourceFile,
        bicepVersion: "latest",
      };

      configureReadFile(filePath => {
        if (filePath === configPath)
          return JSON.stringify({ bicep: { version: constraint } });
        throw `Unexpected file path: ${filePath}`;
      });

      configureBicepInstallMock((tmpDir, version) => {
        expect(version).toBe("latest");
        return Promise.resolve("/path/to/bicep");
      });

      configureCompileMock(() => ({
        success: true,
        diagnostics: [],
        contents: readTestFile("files/basic/main.json"),
      }));

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, noopCache);

      const warnings = logger.getExternalMessages("repository", "warning");
      expect(
        warnings.some(log =>
          log.includes(
            `Could not verify that the requested Bicep version "latest" satisfies the "bicep.version" constraint "${constraint}" declared in ${configPath}`,
          ),
        ),
      ).toBe(true);
    });

    it("throws when no published release satisfies the config chain constraint", async () => {
      const config: FileConfig = {
        templateFile: sourceFile,
      };
      const unreachableConstraint = ">=9.9.0, <10.0.0";

      configureReadFile(filePath => {
        if (filePath === configPath)
          return JSON.stringify({ bicep: { version: unreachableConstraint } });
        throw `Unexpected file path: ${filePath}`;
      });

      configureBicepListReleasesMock(["1.2.0", "1.2.5", "1.3.0"]);

      const logger = new TestLogger();

      await expect(
        async () => await getTemplateAndParameters(config, logger, noopCache),
      ).rejects.toThrow(
        `No published Bicep CLI release satisfies the "bicep.version" constraint "${unreachableConstraint}" declared in ${configPath}.`,
      );
    });

    it("resolves the config chain next to the .bicepparam file, not the template it references", async () => {
      const paramFile = "/path/to/main.bicepparam";
      const paramConfigPath = resolvedConfigPath(paramFile);

      const config: FileConfig = {
        parametersFile: paramFile,
      };

      configureReadFile(filePath => {
        if (filePath === paramConfigPath)
          return JSON.stringify({ bicep: { version: constraint } });
        throw `Unexpected file path: ${filePath}`;
      });

      configureBicepListReleasesMock(["1.2.0", "1.2.5", "1.3.0"]);

      configureBicepInstallMock((tmpDir, version) => {
        expect(version).toBe("1.2.5");
        return Promise.resolve("/path/to/bicep");
      });

      configureCompileParamsMock(() => ({
        success: true,
        diagnostics: [],
        template: readTestFile("files/basic/main.json"),
        parameters: readTestFile("files/basic/main.parameters.json"),
      }));

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, noopCache);

      const configChainLogs = logger.getExternalMessages("repository", "info");
      expect(
        configChainLogs.some(log =>
          log.includes(
            `Resolved Bicep version 1.2.5 to satisfy the "bicep.version" constraint "${constraint}" declared in ${paramConfigPath}`,
          ),
        ),
      ).toBe(true);
    });

    it("resolves the version from a parent config via the extends chain when the nearest config doesn't set one", async () => {
      const config: FileConfig = {
        templateFile: sourceFile,
      };
      const parentConfigPath = path.join(
        path.dirname(configPath),
        "..",
        "bicepconfig.json",
      );

      configureReadFile(filePath => {
        if (filePath === configPath)
          return JSON.stringify({ extends: "../bicepconfig.json" });
        if (filePath === parentConfigPath)
          return JSON.stringify({ bicep: { version: constraint } });
        throw `Unexpected file path: ${filePath}`;
      });

      configureBicepListReleasesMock(["1.2.0", "1.2.5", "1.3.0"]);

      configureBicepInstallMock((tmpDir, version) => {
        expect(version).toBe("1.2.5");
        return Promise.resolve("/path/to/bicep");
      });

      configureCompileMock(() => ({
        success: true,
        diagnostics: [],
        contents: readTestFile("files/basic/main.json"),
      }));

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, noopCache);

      const configChainLogs = logger.getExternalMessages("repository", "info");
      expect(
        configChainLogs.some(log =>
          log.includes(
            `Resolved Bicep version 1.2.5 to satisfy the "bicep.version" constraint "${constraint}" declared in ${parentConfigPath}`,
          ),
        ),
      ).toBe(true);
    });
  });

  it.each([
    {
      description: "parameter file",
      config: {
        parametersFile: "/path/to/parameters.what",
        templateFile: "/path/to/main.json",
      },
      expectedError:
        "Unsupported parameters file type: /path/to/parameters.what",
    },
    {
      description: "template file",
      config: {
        parametersFile: "/path/to/parameters.json",
        templateFile: "/path/to/main.what",
      },
      expectedError: "Unsupported template file type: /path/to/main.what",
    },
  ])(
    "blocks unexpected $description extension",
    async ({ config, expectedError }) => {
      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const logger = new TestLogger();

      await expect(
        async () => await getTemplateAndParameters(config, logger, noopCache),
      ).rejects.toThrow(expectedError);
    },
  );

  it("requires template file when using JSON parameters", async () => {
    const config: FileConfig = {
      parametersFile: "/path/to/parameters.json",
      templateFile: undefined,
    };

    configureReadFile(filePath => {
      if (filePath === "/path/to/parameters.json")
        return readTestFile("files/basic/main.parameters.json");
      throw `Unexpected file path: ${filePath}`;
    });

    const logger = new TestLogger();

    await expect(
      async () => await getTemplateAndParameters(config, logger, noopCache),
    ).rejects.toThrow("Template file is required");
  });

  it("throws when JSON parameters file does not exist", async () => {
    const config: FileConfig = {
      parametersFile: "/path/to/nonexistent.json",
    };

    configureExistsSync(false);

    const logger = new TestLogger();

    await expect(
      async () => await getJsonParameters(config, logger),
    ).rejects.toThrow("Parameters file not found: /path/to/nonexistent.json");
  });
});

describe("file parsing with parameters", () => {
  it("accepts parameter overrides", async () => {
    configureReadFile(filePath => {
      if (filePath === "/parameters.json")
        return readTestFile("files/basic/main.parameters.json");
      throw `Unexpected file path: ${filePath}`;
    });

    const logger = new TestLogger();
    const parameters = await getJsonParameters(
      {
        parametersFile: "/parameters.json",
        parameters: {
          objectParam: "this param has been overridden!",
        },
      },
      logger,
    );

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

    const logger = new TestLogger();
    const parameters = await getJsonParameters(
      {
        parametersFile: "/parameters.json",
        parameters: {
          objectParam: "this param has been overridden!",
        },
      },
      logger,
    );

    expect(JSON.parse(parameters).parameters).toStrictEqual({
      objectParam: {
        value: "this param has been overridden!",
      },
    });
  });

  it("works without a parameters file", async () => {
    const logger = new TestLogger();
    const parameters = await getJsonParameters(
      {
        parameters: {
          objectParam: "this param has been overridden!",
        },
      },
      logger,
    );

    expect(JSON.parse(parameters).parameters).toStrictEqual({
      objectParam: {
        value: "this param has been overridden!",
      },
    });
  });
});
