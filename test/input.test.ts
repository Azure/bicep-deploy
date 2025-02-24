// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { configureGetInputMock } from "./mocks/actionCoreMocks";
import {
  getOptionalBooleanInput,
  getOptionalDictionaryInput,
  getOptionalEnumArrayInput,
  getOptionalStringArrayInput,
  getOptionalStringDictionaryInput,
  getOptionalStringInput,
  getRequiredStringInput,
} from "../src/helpers/input";

describe("getRequiredStringInput", () => {
  it("throws for missing required input", async () => {
    configureGetInputMock({});

    expect(() => getRequiredStringInput("type")).toThrow(
      "Action input 'type' is required but not provided",
    );
  });

  it("accepts input", async () => {
    configureGetInputMock({ type: "foo" });

    expect(getRequiredStringInput("type")).toBe("foo");
  });

  it("trims input", async () => {
    configureGetInputMock({ type: "  foo   " });

    expect(getRequiredStringInput("type")).toBe("foo");
  });
});

describe("getOptionalStringInput", () => {
  it("returns empty for missing input", async () => {
    configureGetInputMock({});

    expect(getOptionalStringInput("type")).toBeUndefined();
  });

  it("accepts input", async () => {
    configureGetInputMock({ type: "foo" });

    expect(getOptionalStringInput("type")).toBe("foo");
  });

  it("trims input", async () => {
    configureGetInputMock({ type: "  foo   " });

    expect(getOptionalStringInput("type")).toBe("foo");
  });
});

describe("getOptionalStringArrayInput", () => {
  it("returns undefined for missing input", async () => {
    configureGetInputMock({});

    expect(getOptionalStringArrayInput("type")).toStrictEqual(undefined);
  });

  it("accepts a single input", async () => {
    configureGetInputMock({ type: "foo" });

    expect(getOptionalStringArrayInput("type")).toStrictEqual(["foo"]);
  });

  it("accepts comma-separated input", async () => {
    configureGetInputMock({ type: "foo,bar,baz,foo" });

    expect(getOptionalStringArrayInput("type")).toStrictEqual([
      "foo",
      "bar",
      "baz",
      "foo",
    ]);
  });

  it("trims input", async () => {
    configureGetInputMock({ type: " foo , bar      ,     baz,foo" });

    expect(getOptionalStringArrayInput("type")).toStrictEqual([
      "foo",
      "bar",
      "baz",
      "foo",
    ]);
  });
});

describe("getOptionalEnumArrayInput", () => {
  it("returns undefined for missing input", async () => {
    configureGetInputMock({});

    expect(getOptionalEnumArrayInput("type", ["foo", "bar"])).toStrictEqual(
      undefined,
    );
  });

  it("accepts a single input", async () => {
    configureGetInputMock({ type: "foo" });

    expect(
      getOptionalEnumArrayInput("type", ["foo", "bar", "baz"]),
    ).toStrictEqual(["foo"]);
  });

  it("accepts comma-separated input", async () => {
    configureGetInputMock({ type: "foo,bar,baz,foo" });

    expect(
      getOptionalEnumArrayInput("type", ["foo", "bar", "baz"]),
    ).toStrictEqual(["foo", "bar", "baz", "foo"]);
  });

  it("trims input", async () => {
    configureGetInputMock({ type: " foo , bar      ,     baz,foo" });

    expect(
      getOptionalEnumArrayInput("type", ["foo", "bar", "baz"]),
    ).toStrictEqual(["foo", "bar", "baz", "foo"]);
  });

  it("throws for unexpected enum input", async () => {
    configureGetInputMock({ type: "foo,qux,baz" });

    expect(() =>
      getOptionalEnumArrayInput("type", ["foo", "bar", "baz"]),
    ).toThrow(
      "Action input 'type' must be one of the following values: 'foo', 'bar', 'baz'",
    );
  });
});

describe("getOptionalBooleanInput", () => {
  it("returns false for missing input", async () => {
    configureGetInputMock({});

    expect(getOptionalBooleanInput("type")).toBe(false);
  });

  it("trims input", async () => {
    configureGetInputMock({ type: " true   " });

    expect(getOptionalBooleanInput("type")).toBe(true);
  });

  it("accepts different casings", async () => {
    configureGetInputMock({ type: " TrUe   " });

    expect(getOptionalBooleanInput("type")).toBe(true);
  });

  it("accepts false", async () => {
    configureGetInputMock({ type: " false   " });

    expect(getOptionalBooleanInput("type")).toBe(false);
  });
});

describe("getOptionalDictionaryInput", () => {
  it("returns empty object for missing input", async () => {
    configureGetInputMock({});

    expect(getOptionalDictionaryInput("type")).toStrictEqual({});
  });

  it("throws for unexpected input", async () => {
    configureGetInputMock({ type: "notanobject" });

    expect(() => getOptionalDictionaryInput("type")).toThrow(
      "Action input 'type' must be a valid JSON object",
    );
  });

  it("parses and returns json input", async () => {
    configureGetInputMock({ type: ' {"abc": "def"} ' });

    expect(getOptionalDictionaryInput("type")).toStrictEqual({
      abc: "def",
    });
  });

  it("handles multi-line and complex input", async () => {
    configureGetInputMock({
      type: `{
  "intParam": {
    "value": 42
  },
  "stringParam": {
    "value": "hello world"
  },
  "objectParam": {
    "value": {
      "prop1": "value1",
      "prop2": "value2"
    }
  }
}`,
    });

    expect(getOptionalDictionaryInput("type")).toStrictEqual({
      intParam: { value: 42 },
      stringParam: { value: "hello world" },
      objectParam: { value: { prop1: "value1", prop2: "value2" } },
    });
  });
});

describe("getOptionalStringDictionaryInput", () => {
  it("returns empty object for missing input", async () => {
    configureGetInputMock({});

    expect(getOptionalStringDictionaryInput("type")).toStrictEqual({});
  });

  it("throws for unexpected input", async () => {
    configureGetInputMock({ type: "notanobject" });

    expect(() => getOptionalStringDictionaryInput("type")).toThrow(
      "Action input 'type' must be a valid JSON object",
    );
  });

  it("parses and returns json input", async () => {
    configureGetInputMock({ type: ' {"abc": "def"} ' });

    expect(getOptionalStringDictionaryInput("type")).toStrictEqual({
      abc: "def",
    });
  });

  it("only accepts string values", async () => {
    configureGetInputMock({ type: '{ "abc": { "def": "ghi" } }' });

    expect(() => getOptionalStringDictionaryInput("type")).toThrow(
      "Action input 'type' must be a valid JSON object containing only string values",
    );
  });
});
