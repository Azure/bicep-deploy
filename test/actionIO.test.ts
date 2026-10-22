// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { mockActionsCore } from "./mocks/actionCoreMocks";
import { ActionOutputSetter } from "../src/actionIO";

describe("ActionOutputSetter", () => {
  const outputSetter = new ActionOutputSetter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets ordinary outputs without registering a mask", () => {
    outputSetter.setOutputVariable("publicOutput", "public-marker", {
      isSecret: false,
    });

    expect(mockActionsCore.setSecret).not.toHaveBeenCalled();
    expect(mockActionsCore.setOutput).toHaveBeenCalledExactlyOnceWith(
      "publicOutput",
      "public-marker",
    );
  });

  it("registers a mask before setting a secret output", () => {
    outputSetter.setOutputVariable("secretOutput", "secret-marker", {
      isSecret: true,
    });

    expect(mockActionsCore.setSecret).toHaveBeenCalledExactlyOnceWith(
      "secret-marker",
    );
    expect(mockActionsCore.setOutput).toHaveBeenCalledExactlyOnceWith(
      "secretOutput",
      "secret-marker",
    );
    expect(mockActionsCore.setSecret.mock.invocationCallOrder[0]).toBeLessThan(
      mockActionsCore.setOutput.mock.invocationCallOrder[0],
    );
  });

  it.each([
    [{ key: "value" }, '{"key":"value"}'],
    [["one", "two"], '["one","two"]'],
    [42, "42"],
    [null, ""],
  ])(
    "registers the serialized output value with the masker",
    (value, expectedMask) => {
      outputSetter.setOutputVariable("secretOutput", value, { isSecret: true });

      expect(mockActionsCore.setSecret).toHaveBeenCalledExactlyOnceWith(
        expectedMask,
      );
      expect(mockActionsCore.setOutput).toHaveBeenCalledExactlyOnceWith(
        "secretOutput",
        value,
      );
    },
  );
});
