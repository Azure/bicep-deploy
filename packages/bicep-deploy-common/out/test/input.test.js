"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
const input_1 = require("../src/input");
const inputMocks_1 = require("./mocks/inputMocks");
const inputReader = new inputMocks_1.mockInputReader();
describe("getRequiredStringInput", () => {
    it("throws for missing required input", async () => {
        (0, inputMocks_1.configureGetInputMock)({}, inputReader);
        expect(() => (0, input_1.getRequiredStringInput)("type", inputReader)).toThrow("Action input 'type' is required but not provided");
    });
    it("accepts input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "foo" }, inputReader);
        expect((0, input_1.getRequiredStringInput)("type", inputReader)).toBe("foo");
    });
    it("trims input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "  foo   " }, inputReader);
        expect((0, input_1.getRequiredStringInput)("type", inputReader)).toBe("foo");
    });
});
describe("getOptionalStringInput", () => {
    it("returns empty for missing input", async () => {
        (0, inputMocks_1.configureGetInputMock)({}, inputReader);
        expect((0, input_1.getOptionalStringInput)("type", inputReader)).toBeUndefined();
    });
    it("accepts input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "foo" }, inputReader);
        expect((0, input_1.getOptionalStringInput)("type", inputReader)).toBe("foo");
    });
    it("trims input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "  foo   " }, inputReader);
        expect((0, input_1.getOptionalStringInput)("type", inputReader)).toBe("foo");
    });
});
describe("getOptionalStringArrayInput", () => {
    it("returns undefined for missing input", async () => {
        (0, inputMocks_1.configureGetInputMock)({}, inputReader);
        expect((0, input_1.getOptionalStringArrayInput)("type", inputReader)).toStrictEqual(undefined);
    });
    it("accepts a single input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "foo" }, inputReader);
        expect((0, input_1.getOptionalStringArrayInput)("type", inputReader)).toStrictEqual([
            "foo",
        ]);
    });
    it("accepts comma-separated input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "foo,bar,baz,foo" }, inputReader);
        expect((0, input_1.getOptionalStringArrayInput)("type", inputReader)).toStrictEqual([
            "foo",
            "bar",
            "baz",
            "foo",
        ]);
    });
    it("trims input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: " foo , bar      ,     baz,foo" }, inputReader);
        expect((0, input_1.getOptionalStringArrayInput)("type", inputReader)).toStrictEqual([
            "foo",
            "bar",
            "baz",
            "foo",
        ]);
    });
});
describe("getOptionalEnumArrayInput", () => {
    it("returns undefined for missing input", async () => {
        (0, inputMocks_1.configureGetInputMock)({}, inputReader);
        expect((0, input_1.getOptionalEnumArrayInput)("type", ["foo", "bar"], inputReader)).toStrictEqual(undefined);
    });
    it("accepts a single input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "foo" }, inputReader);
        expect((0, input_1.getOptionalEnumArrayInput)("type", ["foo", "bar", "baz"], inputReader)).toStrictEqual(["foo"]);
    });
    it("accepts comma-separated input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "foo,bar,baz,foo" }, inputReader);
        expect((0, input_1.getOptionalEnumArrayInput)("type", ["foo", "bar", "baz"], inputReader)).toStrictEqual(["foo", "bar", "baz", "foo"]);
    });
    it("trims input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: " foo , bar      ,     baz,foo" }, inputReader);
        expect((0, input_1.getOptionalEnumArrayInput)("type", ["foo", "bar", "baz"], inputReader)).toStrictEqual(["foo", "bar", "baz", "foo"]);
    });
    it("throws for unexpected enum input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "foo,qux,baz" }, inputReader);
        expect(() => (0, input_1.getOptionalEnumArrayInput)("type", ["foo", "bar", "baz"], inputReader)).toThrow("Action input 'type' must be one of the following values: 'foo', 'bar', 'baz'");
    });
});
describe("getOptionalBooleanInput", () => {
    it("returns false for missing input", async () => {
        (0, inputMocks_1.configureGetInputMock)({}, inputReader);
        expect((0, input_1.getOptionalBooleanInput)("type", inputReader)).toBe(false);
    });
    it("trims input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: " true   " }, inputReader);
        expect((0, input_1.getOptionalBooleanInput)("type", inputReader)).toBe(true);
    });
    it("accepts different casings", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: " TrUe   " }, inputReader);
        expect((0, input_1.getOptionalBooleanInput)("type", inputReader)).toBe(true);
    });
    it("accepts false", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: " false   " }, inputReader);
        expect((0, input_1.getOptionalBooleanInput)("type", inputReader)).toBe(false);
    });
});
describe("getOptionalDictionaryInput", () => {
    it("returns undefined for missing input", async () => {
        (0, inputMocks_1.configureGetInputMock)({}, inputReader);
        expect((0, input_1.getOptionalDictionaryInput)("type", inputReader)).toStrictEqual(undefined);
    });
    it("throws for unexpected input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "notanobject" }, inputReader);
        expect(() => (0, input_1.getOptionalDictionaryInput)("type", inputReader)).toThrow("Action input 'type' must be a valid JSON or YAML object");
    });
    it("parses and returns json input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: ' {"abc": "def"} ' }, inputReader);
        expect((0, input_1.getOptionalDictionaryInput)("type", inputReader)).toStrictEqual({
            abc: "def",
        });
    });
    it("handles multi-line and complex input", async () => {
        (0, inputMocks_1.configureGetInputMock)({
            type: `{
  "intParam": 42,
  "stringParam": "hello world",
  "objectParam": {
    "prop1": "value1",
    "prop2": "value2"
  }
}`,
        }, inputReader);
        expect((0, input_1.getOptionalDictionaryInput)("type", inputReader)).toStrictEqual({
            intParam: 42,
            stringParam: "hello world",
            objectParam: { prop1: "value1", prop2: "value2" },
        });
    });
    it("handles YAML input", async () => {
        (0, inputMocks_1.configureGetInputMock)({
            type: `
intParam: 42
stringParam: hello world
objectParam:
  prop1: value1
  prop2: value2
`,
        }, inputReader);
        expect((0, input_1.getOptionalDictionaryInput)("type", inputReader)).toStrictEqual({
            intParam: 42,
            stringParam: "hello world",
            objectParam: { prop1: "value1", prop2: "value2" },
        });
    });
});
describe("getOptionalStringDictionaryInput", () => {
    it("returns undefined for missing input", async () => {
        (0, inputMocks_1.configureGetInputMock)({}, inputReader);
        expect((0, input_1.getOptionalStringDictionaryInput)("type", inputReader)).toStrictEqual(undefined);
    });
    it("throws for unexpected input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: "notanobject" }, inputReader);
        expect(() => (0, input_1.getOptionalStringDictionaryInput)("type", inputReader)).toThrow("Action input 'type' must be a valid JSON or YAML object");
    });
    it("parses and returns json input", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: ' {"abc": "def"} ' }, inputReader);
        expect((0, input_1.getOptionalStringDictionaryInput)("type", inputReader)).toStrictEqual({
            abc: "def",
        });
    });
    it("only accepts string values", async () => {
        (0, inputMocks_1.configureGetInputMock)({ type: '{ "abc": { "def": "ghi" } }' }, inputReader);
        expect(() => (0, input_1.getOptionalStringDictionaryInput)("type", inputReader)).toThrow("Action input 'type' must be a valid JSON or YAML object containing only string values");
    });
});
//# sourceMappingURL=input.test.js.map