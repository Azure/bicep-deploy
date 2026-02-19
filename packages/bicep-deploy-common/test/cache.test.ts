// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  configureBicepInstallMock,
  configureBicepGetDownloadUrlMock,
  configureCompileMock,
  configureCompileParamsMock,
} from "./mocks/bicepNodeMocks";
import { configureReadFile } from "./mocks/fsMocks";
import { mockBicepCache } from "./mocks/cacheMocks";
import { Bicep } from "bicep-node";
import { FileConfig } from "../src/config";
import { TestLogger } from "./logging";
import { getTemplateAndParameters } from "../src/file";
import { readTestFile } from "./utils";

function setupBicepCompile() {
  configureCompileMock(() => ({
    success: true,
    diagnostics: [],
    contents: readTestFile("files/basic/main.json"),
  }));
}

function setupBicepCompileParams() {
  configureCompileParamsMock(() => ({
    success: true,
    diagnostics: [],
    template: readTestFile("files/basic/main.json"),
    parameters: readTestFile("files/basic/main.parameters.json"),
  }));
}

describe("BicepCache", () => {
  describe("pinned version", () => {
    it("skips download on cache hit", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue("/cached/bicep");

      const installMock = vi.fn();
      configureBicepInstallMock(installMock);
      setupBicepCompile();

      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        parametersFile: "/path/to/parameters.json",
        bicepVersion: "0.30.23",
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      expect(cache.find).toHaveBeenCalledWith("0.30.23");
      expect(installMock).not.toHaveBeenCalled();
      expect(cache.save).not.toHaveBeenCalled();
    });

    it("downloads and saves to cache on cache miss", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue(undefined);
      cache.save.mockResolvedValue("/cached/bicep");

      configureBicepInstallMock(async (tmpDir, version) => {
        expect(version).toBe("0.30.23");
        return "/tmp/bicep-abc/bicep";
      });
      setupBicepCompile();

      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        parametersFile: "/path/to/parameters.json",
        bicepVersion: "0.30.23",
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      expect(cache.find).toHaveBeenCalledWith("0.30.23");
      expect(cache.save).toHaveBeenCalledWith(
        "/tmp/bicep-abc/bicep",
        "0.30.23",
      );
    });
  });

  describe("latest version (no bicepVersion specified)", () => {
    it("resolves version, downloads, and saves to cache on miss", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue(undefined);
      cache.save.mockResolvedValue("/cached/bicep");

      configureBicepInstallMock(async (tmpDir, version) => {
        expect(version).toBe("1.2.3");
        return "/tmp/bicep-xyz/bicep";
      });
      setupBicepCompile();

      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        parametersFile: "/path/to/parameters.json",
        // no bicepVersion — uses "latest"
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      // Should resolve version via getDownloadUrl (mock returns URL with "1.2.3")
      // Then check cache with resolved version, miss, download, and save
      expect(cache.find).toHaveBeenCalledWith("1.2.3");
      expect(cache.save).toHaveBeenCalledWith("/tmp/bicep-xyz/bicep", "1.2.3");
    });

    it("skips download when resolved version is already cached", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue("/cached/bicep");

      const installMock = vi.fn();
      configureBicepInstallMock(installMock);
      setupBicepCompile();

      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        parametersFile: "/path/to/parameters.json",
        // no bicepVersion — uses "latest"
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      // Resolves to "1.2.3" via getDownloadUrl, cache hit, no download
      expect(cache.find).toHaveBeenCalledWith("1.2.3");
      expect(installMock).not.toHaveBeenCalled();
      expect(cache.save).not.toHaveBeenCalled();
    });
  });

  describe("bicepparam files", () => {
    it("passes cache through for bicepparam compilation", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue("/cached/bicep");

      const installMock = vi.fn();
      configureBicepInstallMock(installMock);
      setupBicepCompileParams();

      const config: FileConfig = {
        parametersFile: "/path/to/main.bicepparam",
        bicepVersion: "0.30.23",
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      // Cache hit — no download needed
      expect(cache.find).toHaveBeenCalledWith("0.30.23");
      expect(installMock).not.toHaveBeenCalled();
      expect(cache.save).not.toHaveBeenCalled();
    });
  });

  describe("logging", () => {
    it("logs cache hit message", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue("/cached/bicep");

      configureBicepInstallMock(vi.fn());
      setupBicepCompile();

      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        parametersFile: "/path/to/parameters.json",
        bicepVersion: "0.30.23",
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      const infoLogs = logger.getInfoMessages();
      expect(
        infoLogs.some(log =>
          log.includes("Using cached Bicep version 0.30.23 from /cached/bicep"),
        ),
      ).toBe(true);
    });

    it("logs download message on cache miss", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue(undefined);

      configureBicepInstallMock(async () => "/tmp/bicep-abc/bicep");
      setupBicepCompile();

      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        parametersFile: "/path/to/parameters.json",
        bicepVersion: "0.30.23",
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      const infoLogs = logger.getInfoMessages();
      expect(
        infoLogs.some(log =>
          log.includes("Downloading Bicep version 0.30.23..."),
        ),
      ).toBe(true);
    });
  });

  describe("version resolution", () => {
    it("passes resolved version to Bicep.install for latest", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue(undefined);

      const installMock = vi
        .fn<(tmpDir: string, version?: string) => Promise<string>>()
        .mockResolvedValue("/tmp/bicep-xyz/bicep");
      configureBicepInstallMock(installMock);
      setupBicepCompile();

      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        parametersFile: "/path/to/parameters.json",
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      // Bicep.install should be called with the resolved concrete version, not undefined
      expect(installMock.mock.calls[0][1]).toBe("1.2.3");
    });

    it("throws when getDownloadUrl returns an unparseable URL", async () => {
      const cache = new mockBicepCache();
      configureBicepGetDownloadUrlMock(
        async () => "https://example.com/bad-url",
      );
      configureBicepInstallMock(vi.fn());
      setupBicepCompile();

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        bicepVersion: undefined,
      };

      const logger = new TestLogger();
      await expect(
        async () => await getTemplateAndParameters(config, logger, cache),
      ).rejects.toThrow(
        "Failed to resolve Bicep version from download URL: https://example.com/bad-url",
      );
    });
  });

  describe("JSON template passthrough", () => {
    it("does not call installBicep for JSON-only files", async () => {
      const cache = new mockBicepCache();
      const installMock = vi.fn();
      configureBicepInstallMock(installMock);

      configureReadFile(filePath => {
        if (filePath === "/path/to/template.json")
          return readTestFile("files/basic/main.json");
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/template.json",
        parametersFile: "/path/to/parameters.json",
      };

      const logger = new TestLogger();
      await getTemplateAndParameters(config, logger, cache);

      expect(installMock).not.toHaveBeenCalled();
      expect(cache.find).not.toHaveBeenCalled();
      expect(cache.save).not.toHaveBeenCalled();
    });
  });

  describe("parallel race condition", () => {
    // When multiple parallel callers (e.g. vitest running live test files
    // concurrently) both miss the cache and download simultaneously, their
    // cache.save() calls race on the same target directory. Both tc.cacheFile
    // and toolLib.cacheFile internally do rmRF + mkdirP + copy, so one
    // caller's save can delete the binary while the other caller's
    // Bicep.initialize() is trying to spawn it, producing:
    //   "Failed to invoke '/cached/bicep jsonrpc'. Error:"
    //
    // The fix: installBicep() returns the caller's private temp download path
    // instead of the shared cached path. cache.save() is still called to
    // populate the cache for future invocations, but the current caller is
    // isolated from any concurrent save operations.
    it("each caller uses its own install path, not the shared cached path", async () => {
      const cache = new mockBicepCache();
      cache.find.mockResolvedValue(undefined);
      cache.save.mockResolvedValue("/shared/cached/bicep");

      let callCount = 0;
      configureBicepInstallMock(async () => {
        callCount++;
        return `/tmp/bicep-${callCount}/bicep`;
      });
      setupBicepCompile();

      configureReadFile(filePath => {
        if (filePath === "/path/to/parameters.json")
          return readTestFile("files/basic/main.parameters.json");
        throw `Unexpected file path: ${filePath}`;
      });

      const config: FileConfig = {
        templateFile: "/path/to/main.bicep",
        parametersFile: "/path/to/parameters.json",
        bicepVersion: "0.30.23",
      };

      const logger = new TestLogger();
      vi.mocked(Bicep.initialize).mockClear();

      await Promise.all([
        getTemplateAndParameters(config, logger, cache),
        getTemplateAndParameters(config, logger, cache),
      ]);

      // Each call should use its own unique install path for Bicep.initialize,
      // NOT the shared cached path returned by cache.save()
      const initCalls = vi.mocked(Bicep.initialize).mock.calls;
      expect(initCalls).toHaveLength(2);
      expect(initCalls[0][0]).toBe("/tmp/bicep-1/bicep");
      expect(initCalls[1][0]).toBe("/tmp/bicep-2/bicep");
    });
  });
});
