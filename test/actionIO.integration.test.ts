// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ActionOutputSetter } from "../src/actionIO";

describe("ActionOutputSetter with @actions/core", () => {
  const originalGithubOutput = process.env.GITHUB_OUTPUT;
  let tempDirectory: string | undefined;

  afterEach(() => {
    if (originalGithubOutput === undefined) {
      delete process.env.GITHUB_OUTPUT;
    } else {
      process.env.GITHUB_OUTPUT = originalGithubOutput;
    }
    if (tempDirectory) {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
      tempDirectory = undefined;
    }
    vi.restoreAllMocks();
  });

  it("registers the mask before the modern output file is processed", () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "action-output-"));
    const outputFile = path.join(tempDirectory, "github-output");
    fs.writeFileSync(outputFile, "");
    process.env.GITHUB_OUTPUT = outputFile;
    const stdout = captureStdout();

    new ActionOutputSetter().setOutputVariable(
      "secretOutput",
      "secret-marker",
      { isSecret: true },
    );

    expect(stdout()).toContain("::add-mask::secret-marker");
    expect(stdout()).not.toContain("::set-output");
    const fileContents = fs.readFileSync(outputFile, "utf8");
    expect(fileContents).toContain("secretOutput<<ghadelimiter_");
    expect(fileContents).toContain("secret-marker");
  });
});

function captureStdout(): () => string {
  let output = "";
  vi.spyOn(process.stdout, "write").mockImplementation(chunk => {
    output += chunk.toString();
    return true;
  });
  return () => output;
}
