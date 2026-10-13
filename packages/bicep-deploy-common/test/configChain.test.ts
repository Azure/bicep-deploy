// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

import { resolveConfigChain, MAX_EXTENDS_DEPTH } from "../src/configChain";

// Uses real temp directories, not fsMocks, since this walks multiple real directories and
// fsMocks can only fake one file existing at a time.

async function writeConfig(filePath: string, contents: object) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(contents), "utf8");
}

describe("resolveConfigChain", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "configchain-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns an empty result when no bicepconfig.json exists", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");

    const result = await resolveConfigChain(sourceFile);

    expect(result).toEqual({});
  });

  it("resolves bicep.version from a single config file next to the source file", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      bicep: { version: "0.31.92" },
    });

    const result = await resolveConfigChain(sourceFile);

    expect(result.bicepVersionRange?.toString()).toBe("0.31.92");
    expect(result.declaringConfigPath).toBe(
      path.join(tmpDir, "bicepconfig.json"),
    );
  });

  it("discovers the nearest config file by walking up parent directories", async () => {
    const nested = path.join(tmpDir, "a", "b", "c");
    const sourceFile = path.join(nested, "main.bicep");
    await fs.mkdir(nested, { recursive: true });
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      bicep: { version: ">=0.31.0, <1.0.0" },
    });

    const result = await resolveConfigChain(sourceFile);

    expect(result.bicepVersionRange?.toString()).toBe(">=0.31.0, <1.0.0");
    expect(result.declaringConfigPath).toBe(
      path.join(tmpDir, "bicepconfig.json"),
    );
  });

  it("prefers the leaf layer's bicep.version over a layer it extends", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "base.json"), {
      bicep: { version: "0.30.0" },
    });
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      extends: "./base.json",
      bicep: { version: "0.31.92" },
    });

    const result = await resolveConfigChain(sourceFile);

    expect(result.bicepVersionRange?.toString()).toBe("0.31.92");
    expect(result.declaringConfigPath).toBe(
      path.join(tmpDir, "bicepconfig.json"),
    );
  });

  it("falls back to an extended layer's bicep.version when the leaf doesn't set one", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "base.json"), {
      bicep: { version: "0.30.0" },
    });
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      extends: "./base.json",
    });

    const result = await resolveConfigChain(sourceFile);

    expect(result.bicepVersionRange?.toString()).toBe("0.30.0");
    expect(result.declaringConfigPath).toBe(path.join(tmpDir, "base.json"));
  });

  it("walks a multi-level extends chain", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "grandparent.json"), {
      bicep: { version: "0.29.0" },
    });
    await writeConfig(path.join(tmpDir, "parent.json"), {
      extends: "./grandparent.json",
    });
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      extends: "./parent.json",
    });

    const result = await resolveConfigChain(sourceFile);

    expect(result.bicepVersionRange?.toString()).toBe("0.29.0");
    expect(result.declaringConfigPath).toBe(
      path.join(tmpDir, "grandparent.json"),
    );
  });

  it("returns an empty result when no layer in the chain sets bicep.version", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "base.json"), {});
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      extends: "./base.json",
    });

    const result = await resolveConfigChain(sourceFile);

    expect(result).toEqual({});
  });

  it("throws when the extends chain forms a cycle", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "a.json"), { extends: "./b.json" });
    await writeConfig(path.join(tmpDir, "b.json"), { extends: "./a.json" });
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      extends: "./a.json",
    });

    await expect(resolveConfigChain(sourceFile)).rejects.toThrow(
      /Cycle detected/,
    );
  });

  it("throws when a self-referencing extends chain forms a cycle", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      extends: "./bicepconfig.json",
    });

    await expect(resolveConfigChain(sourceFile)).rejects.toThrow(
      /Cycle detected/,
    );
  });

  it("throws when the extends chain exceeds the maximum depth", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");

    const layerCount = MAX_EXTENDS_DEPTH + 1;
    for (let i = 0; i < layerCount; i++) {
      const fileName = i === 0 ? "bicepconfig.json" : `layer${i}.json`;
      const next = i + 1 < layerCount ? `./layer${i + 1}.json` : undefined;
      await writeConfig(path.join(tmpDir, fileName), {
        ...(next ? { extends: next } : {}),
        bicep: { version: "0.31.92" },
      });
    }

    await expect(resolveConfigChain(sourceFile)).rejects.toThrow(
      /maximum supported depth/,
    );
  });

  it("allows a chain exactly at the maximum depth", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");

    const layerCount = MAX_EXTENDS_DEPTH;
    for (let i = 0; i < layerCount; i++) {
      const fileName = i === 0 ? "bicepconfig.json" : `layer${i}.json`;
      const next = i + 1 < layerCount ? `./layer${i + 1}.json` : undefined;
      await writeConfig(path.join(tmpDir, fileName), {
        ...(next ? { extends: next } : {}),
        ...(next ? {} : { bicep: { version: "0.31.92" } }),
      });
    }

    const result = await resolveConfigChain(sourceFile);

    expect(result.bicepVersionRange?.toString()).toBe("0.31.92");
  });

  it("throws when extends points to a relative path that doesn't exist", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      extends: "./missing.json",
    });

    await expect(resolveConfigChain(sourceFile)).rejects.toThrow(
      /Config file not found/,
    );
  });

  it("throws when extends is an absolute path", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      extends: path.join(tmpDir, "base.json"),
    });
    await writeConfig(path.join(tmpDir, "base.json"), {});

    await expect(resolveConfigChain(sourceFile)).rejects.toThrow(
      /must be a relative path/,
    );
  });

  it("throws when bicep.version is not a valid version or range", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      bicep: { version: "not-a-version" },
    });

    await expect(resolveConfigChain(sourceFile)).rejects.toThrow(
      /not a valid Bicep version or version range/,
    );
  });

  it("throws when bicep.version describes an unsatisfiable range", async () => {
    const sourceFile = path.join(tmpDir, "main.bicep");
    await fs.writeFile(sourceFile, "", "utf8");
    await writeConfig(path.join(tmpDir, "bicepconfig.json"), {
      bicep: { version: ">=1.0.0, <0.5.0" },
    });

    await expect(resolveConfigChain(sourceFile)).rejects.toThrow(
      /can never be satisfied/,
    );
  });
});
