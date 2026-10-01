// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const packageDirectory = path.resolve(__dirname, "..");
const rpcPackageDirectory = path.resolve(
  packageDirectory,
  "..",
  "bicep-rpc-client",
);
const fixtureSourceDirectory = path.join(__dirname, "fixture");
const npmExecutable = process.env.npm_execpath;
const retainTarballs = process.argv.includes("--retain-tarballs");
const outputJson = process.argv.includes("--json");

let fixtureDirectory;
const tarballPaths = [];

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(
      `Unable to start command (${command} ${args.join(" ")}) in ${cwd}`,
      { cause: result.error },
    );
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `Command failed (${command} ${args.join(" ")}) in ${cwd}\n${output}`,
    );
  }

  return result.stdout;
}

function runNpm(args, cwd) {
  assert(
    npmExecutable,
    "npm_execpath is required; run this fixture through npm run test:consumer",
  );
  return run(process.execPath, [npmExecutable, ...args], cwd);
}

function copyFixture(targetDirectory) {
  fs.cpSync(fixtureSourceDirectory, targetDirectory, { recursive: true });
}

function assertPackageContents(packResult) {
  const publishedFiles = new Set(packResult.files.map(file => file.path));
  const requiredFiles = [
    "README.md",
    "package.json",
    "dist/index.cjs",
    "dist/index.d.cts",
    "dist/deployments.cjs",
    "dist/deployments.d.cts",
    "dist/stacks.cjs",
    "dist/stacks.d.cts",
  ];

  for (const requiredFile of requiredFiles) {
    assert(
      publishedFiles.has(requiredFile),
      `Packed package is missing required file: ${requiredFile}`,
    );
  }

  for (const publishedFile of publishedFiles) {
    assert(
      !publishedFile.startsWith("test/") &&
        !publishedFile.startsWith("test-consumer/") &&
        !publishedFile.includes("node_modules/"),
      `Packed package contains development-only content: ${publishedFile}`,
    );
  }
}

function pack(packagePath) {
  const packOutput = runNpm(
    ["pack", "--json", "--ignore-scripts"],
    packagePath,
  );
  const packResults = JSON.parse(packOutput);
  assert.equal(packResults.length, 1, "npm pack should produce one tarball");

  const packResult = packResults[0];
  const packedPath = path.join(packagePath, packResult.filename);
  tarballPaths.push(packedPath);
  return { packResult, packedPath };
}

function packCommon(rpcVersion) {
  const packageJsonPath = path.join(packageDirectory, "package.json");
  const originalPackageJson = fs.readFileSync(packageJsonPath);
  const packageJson = JSON.parse(originalPackageJson.toString("utf8"));

  try {
    packageJson.dependencies["@azure/bicep-rpc-client"] = rpcVersion;
    fs.writeFileSync(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
    );
    return pack(packageDirectory);
  } finally {
    fs.writeFileSync(packageJsonPath, originalPackageJson);
  }
}

function findPackageJson(startPath) {
  let currentPath = path.dirname(startPath);
  while (currentPath !== path.dirname(currentPath)) {
    const packageJsonPath = path.join(currentPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    currentPath = path.dirname(currentPath);
  }
  throw new Error(`Could not find package.json for ${startPath}`);
}

function assertInstalledPackagePair(
  fixturePath,
  expectedCommonVersion,
  expectedRpcVersion,
) {
  const commonDirectory = path.join(
    fixturePath,
    "node_modules",
    "@azure",
    "bicep-deploy-common",
  );
  const commonPackage = JSON.parse(
    fs.readFileSync(path.join(commonDirectory, "package.json"), "utf8"),
  );
  assert.equal(commonPackage.version, expectedCommonVersion);
  assert.equal(
    commonPackage.dependencies["@azure/bicep-rpc-client"],
    expectedRpcVersion,
    "Packed common package should require the exact validated RPC version",
  );

  const resolvedRpcEntry = require.resolve("@azure/bicep-rpc-client", {
    paths: [commonDirectory],
  });
  const resolvedRpcPackage = JSON.parse(
    fs.readFileSync(findPackageJson(resolvedRpcEntry), "utf8"),
  );
  assert.equal(
    resolvedRpcPackage.version,
    expectedRpcVersion,
    "Common package should resolve the exact validated RPC version",
  );
}

try {
  const rpcPackage = pack(rpcPackageDirectory);
  const commonPackage = packCommon(rpcPackage.packResult.version);
  assertPackageContents(commonPackage.packResult);

  fixtureDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bicep-deploy-common-consumer-"),
  );
  copyFixture(fixtureDirectory);

  const fixturePackagePath = path.join(fixtureDirectory, "package.json");
  const fixturePackage = JSON.parse(
    fs.readFileSync(fixturePackagePath, "utf8"),
  );
  fixturePackage.dependencies["@azure/bicep-deploy-common"] =
    `file:${commonPackage.packedPath.replaceAll("\\", "/")}`;
  fixturePackage.dependencies["@azure/bicep-rpc-client"] =
    `file:${rpcPackage.packedPath.replaceAll("\\", "/")}`;
  fs.writeFileSync(
    fixturePackagePath,
    `${JSON.stringify(fixturePackage, null, 2)}\n`,
  );

  runNpm(
    [
      "install",
      "--engine-strict",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    fixtureDirectory,
  );
  assertInstalledPackagePair(
    fixtureDirectory,
    commonPackage.packResult.version,
    rpcPackage.packResult.version,
  );
  runNpm(
    ["exec", "--", "tsc", "--project", "tsconfig.json"],
    fixtureDirectory,
  );
  run(process.execPath, ["runtime.cjs"], fixtureDirectory);

  if (outputJson) {
    console.log(
      JSON.stringify({
        common: {
          filename: commonPackage.packedPath,
          version: commonPackage.packResult.version,
        },
        rpc: {
          filename: rpcPackage.packedPath,
          version: rpcPackage.packResult.version,
        },
      }),
    );
  } else {
    console.log("Packed consumer validation passed.");
  }
} finally {
  if (!retainTarballs) {
    for (const tarballPath of tarballPaths) {
      if (fs.existsSync(tarballPath)) {
        fs.rmSync(tarballPath);
      }
    }
  }
  if (fixtureDirectory && fs.existsSync(fixtureDirectory)) {
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  }
}
