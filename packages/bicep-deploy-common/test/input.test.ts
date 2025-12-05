// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  getOptionalStringInput,
  getRequiredStringInput,
  getOptionalStringArrayInput,
  getOptionalEnumArrayInput,
  getOptionalBooleanInput,
  getOptionalDictionaryInput,
  getOptionalStringDictionaryInput,
} from "../src/input";
import { mockInputReader, configureGetInputMock } from "./mocks/inputMocks";

const inputReader = new mockInputReader();

describe("getRequiredStringInput", () => {
  it("throws for missing required input", async () => {
    configureGetInputMock({}, inputReader);

    expect(() => getRequiredStringInput("type", inputReader)).toThrow(
      "Input 'type' is required but not provided",
    );
  });

  it("accepts input", async () => {
    configureGetInputMock({ type: "foo" }, inputReader);

    expect(getRequiredStringInput("type", inputReader)).toBe("foo");
  });

  it("trims input", async () => {
    configureGetInputMock({ type: "  foo   " }, inputReader);

    expect(getRequiredStringInput("type", inputReader)).toBe("foo");
  });
});

describe("getOptionalStringInput", () => {
  it("returns empty for missing input", async () => {
    configureGetInputMock({}, inputReader);

    expect(getOptionalStringInput("type", inputReader)).toBeUndefined();
  });

  it("accepts input", async () => {
    configureGetInputMock({ type: "foo" }, inputReader);

    expect(getOptionalStringInput("type", inputReader)).toBe("foo");
  });

  it("trims input", async () => {
    configureGetInputMock({ type: "  foo   " }, inputReader);

    expect(getOptionalStringInput("type", inputReader)).toBe("foo");
  });
});

describe("getOptionalStringArrayInput", () => {
  it("returns undefined for missing input", async () => {
    configureGetInputMock({}, inputReader);

    expect(getOptionalStringArrayInput("type", inputReader)).toStrictEqual(
      undefined,
    );
  });

  it("accepts a single input", async () => {
    configureGetInputMock({ type: "foo" }, inputReader);

    expect(getOptionalStringArrayInput("type", inputReader)).toStrictEqual([
      "foo",
    ]);
  });

  it("accepts comma-separated input", async () => {
    configureGetInputMock({ type: "foo,bar,baz,foo" }, inputReader);

    expect(getOptionalStringArrayInput("type", inputReader)).toStrictEqual([
      "foo",
      "bar",
      "baz",
      "foo",
    ]);
  });

  it("trims input", async () => {
    configureGetInputMock(
      { type: " foo , bar      ,     baz,foo" },
      inputReader,
    );

    expect(getOptionalStringArrayInput("type", inputReader)).toStrictEqual([
      "foo",
      "bar",
      "baz",
      "foo",
    ]);
  });
});

describe("getOptionalEnumArrayInput", () => {
  it("returns undefined for missing input", async () => {
    configureGetInputMock({}, inputReader);

    expect(
      getOptionalEnumArrayInput("type", ["foo", "bar"], inputReader),
    ).toStrictEqual(undefined);
  });

  it("accepts a single input", async () => {
    configureGetInputMock({ type: "foo" }, inputReader);

    expect(
      getOptionalEnumArrayInput("type", ["foo", "bar", "baz"], inputReader),
    ).toStrictEqual(["foo"]);
  });

  it("accepts comma-separated input", async () => {
    configureGetInputMock({ type: "foo,bar,baz,foo" }, inputReader);

    expect(
      getOptionalEnumArrayInput("type", ["foo", "bar", "baz"], inputReader),
    ).toStrictEqual(["foo", "bar", "baz", "foo"]);
  });

  it("trims input", async () => {
    configureGetInputMock(
      { type: " foo , bar      ,     baz,foo" },
      inputReader,
    );

    expect(
      getOptionalEnumArrayInput("type", ["foo", "bar", "baz"], inputReader),
    ).toStrictEqual(["foo", "bar", "baz", "foo"]);
  });

  it("throws for unexpected enum input", async () => {
    configureGetInputMock({ type: "foo,qux,baz" }, inputReader);

    expect(() =>
      getOptionalEnumArrayInput("type", ["foo", "bar", "baz"], inputReader),
    ).toThrow(
      "Input 'type' must be one of the following values: 'foo', 'bar', 'baz'",
    );
  });
});

describe("getOptionalBooleanInput", () => {
  it("returns false for missing input", async () => {
    configureGetInputMock({}, inputReader);

    expect(getOptionalBooleanInput("type", inputReader)).toBe(false);
  });

  it("trims input", async () => {
    configureGetInputMock({ type: " true   " }, inputReader);

    expect(getOptionalBooleanInput("type", inputReader)).toBe(true);
  });

  it("accepts different casings", async () => {
    configureGetInputMock({ type: " TrUe   " }, inputReader);

    expect(getOptionalBooleanInput("type", inputReader)).toBe(true);
  });

  it("accepts false", async () => {
    configureGetInputMock({ type: " false   " }, inputReader);

    expect(getOptionalBooleanInput("type", inputReader)).toBe(false);
  });
});

describe("getOptionalDictionaryInput", () => {
  it("returns undefined for missing input", async () => {
    configureGetInputMock({}, inputReader);

    expect(getOptionalDictionaryInput("type", inputReader)).toStrictEqual(
      undefined,
    );
  });

  it("throws for unexpected input", async () => {
    configureGetInputMock({ type: "notanobject" }, inputReader);

    expect(() => getOptionalDictionaryInput("type", inputReader)).toThrow(
      "Input 'type' must be a valid JSON or YAML object",
    );
  });

  it("parses and returns json input", async () => {
    configureGetInputMock({ type: ' {"abc": "def"} ' }, inputReader);

    expect(getOptionalDictionaryInput("type", inputReader)).toStrictEqual({
      abc: "def",
    });
  });

  it("handles multi-line and complex input", async () => {
    configureGetInputMock(
      {
        type: `{
  "intParam": 42,
  "stringParam": "hello world",
  "objectParam": {
    "prop1": "value1",
    "prop2": "value2"
  }
}`,
      },
      inputReader,
    );

    expect(getOptionalDictionaryInput("type", inputReader)).toStrictEqual({
      intParam: 42,
      stringParam: "hello world",
      objectParam: { prop1: "value1", prop2: "value2" },
    });
  });

  it("handles YAML input", async () => {
    configureGetInputMock(
      {
        type: `
intParam: 42
stringParam: hello world
objectParam:
  prop1: value1
  prop2: value2
`,
      },
      inputReader,
    );

    expect(getOptionalDictionaryInput("type", inputReader)).toStrictEqual({
      intParam: 42,
      stringParam: "hello world",
      objectParam: { prop1: "value1", prop2: "value2" },
    });
  });
});

describe("getOptionalStringDictionaryInput", () => {
  it("returns undefined for missing input", async () => {
    configureGetInputMock({}, inputReader);

    expect(getOptionalStringDictionaryInput("type", inputReader)).toStrictEqual(
      undefined,
    );
  });

  it("throws for unexpected input", async () => {
    configureGetInputMock({ type: "notanobject" }, inputReader);

    expect(() => getOptionalStringDictionaryInput("type", inputReader)).toThrow(
      "Input 'type' must be a valid JSON or YAML object",
    );
  });

  it("parses and returns json input", async () => {
    configureGetInputMock({ type: ' {"abc": "def"} ' }, inputReader);

    expect(getOptionalStringDictionaryInput("type", inputReader)).toStrictEqual(
      {
        abc: "def",
      },
    );
  });

  it("only accepts string values", async () => {
    configureGetInputMock({ type: '{ "abc": { "def": "ghi" } }' }, inputReader);

    expect(() => getOptionalStringDictionaryInput("type", inputReader)).toThrow(
      "Input 'type' must be a valid JSON or YAML object containing only string values",
    );
  });
});
