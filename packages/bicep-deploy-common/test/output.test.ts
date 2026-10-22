// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeployConfig } from "../src/config";
import { setOutputs } from "../src/output";
import { mockOutputSetter } from "./mocks/outputMocks";

describe("setOutputs", () => {
  const config = {} as DeployConfig;
  const outputSetter = new mockOutputSetter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not set outputs when the deployment returned none", () => {
    setOutputs(config, outputSetter);

    expect(outputSetter.setOutputVariable).not.toHaveBeenCalled();
  });

  it("sets unlisted outputs as non-secret without changing their values", () => {
    const outputs = {
      stringOutput: { value: "visible" },
      numberOutput: { value: 42 },
      objectOutput: { value: { key: "value" } },
      arrayOutput: { value: ["one", "two"] },
      emptyOutput: { value: "" },
      multilineOutput: { value: "first\nsecond" },
    };

    setOutputs(config, outputSetter, outputs);

    for (const [name, output] of Object.entries(outputs)) {
      expect(outputSetter.setOutputVariable).toHaveBeenCalledWith(
        name,
        output.value,
        { isSecret: false },
      );
    }
    expect(outputSetter.setOutputVariable).toHaveBeenCalledTimes(
      Object.keys(outputs).length,
    );
  });

  it("classifies listed outputs as secret using case-insensitive exact names", () => {
    setOutputs({ ...config, maskedOutputs: ["SeCrEtOuTpUt"] }, outputSetter, {
      secretOutput: { value: "secret-marker" },
      publicOutput: { value: "public-marker" },
    });

    expect(outputSetter.setOutputVariable).toHaveBeenCalledWith(
      "secretOutput",
      "secret-marker",
      { isSecret: true },
    );
    expect(outputSetter.setOutputVariable).toHaveBeenCalledWith(
      "publicOutput",
      "public-marker",
      { isSecret: false },
    );
    expect(outputSetter.setOutputVariable).toHaveBeenCalledTimes(2);
  });

  it("does not classify partial output-name matches as secret", () => {
    setOutputs({ ...config, maskedOutputs: ["secret"] }, outputSetter, {
      secretOutput: { value: "public-marker" },
    });

    expect(outputSetter.setOutputVariable).toHaveBeenCalledWith(
      "secretOutput",
      "public-marker",
      { isSecret: false },
    );
  });

  it("does not classify shorter output names as secret", () => {
    setOutputs(
      { ...config, maskedOutputs: ["secretOutputExtra"] },
      outputSetter,
      {
        secretOutput: { value: "public-marker" },
        secret: { value: "another-public-marker" },
      },
    );

    expect(outputSetter.setOutputVariable).toHaveBeenCalledWith(
      "secretOutput",
      "public-marker",
      { isSecret: false },
    );
    expect(outputSetter.setOutputVariable).toHaveBeenCalledWith(
      "secret",
      "another-public-marker",
      { isSecret: false },
    );
    expect(outputSetter.setOutputVariable).toHaveBeenCalledTimes(2);
  });
});
