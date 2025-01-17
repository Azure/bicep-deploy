// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as core from "@actions/core";

import { resolvePath } from "./file";

export function getRequiredStringInput(inputName: string): string {
  return getInput(inputName, undefined, true) as string;
}

export function getOptionalStringInput(inputName: string): string | undefined {
  return getInput(inputName, undefined, false);
}

export function getRequiredEnumInput<TEnum extends string>(
  inputName: string,
  allowedValues: TEnum[],
): TEnum {
  return getInput(inputName, allowedValues, true) as TEnum;
}

export function getOptionalEnumInput<TEnum extends string>(
  inputName: string,
  allowedValues: TEnum[],
): TEnum | undefined {
  return getInput(inputName, allowedValues, false) as TEnum | undefined;
}

export function getOptionalFilePath(inputName: string): string | undefined {
  const input = getOptionalStringInput(inputName);
  if (!input) {
    return;
  }

  return resolvePath(input);
}

export function getOptionalBooleanInput(inputName: string): boolean {
  const input = getOptionalStringInput(inputName);
  if (!input) {
    return false;
  }

  if (input.toLowerCase() === "true") {
    return true;
  } else if (input.toLowerCase() === "false") {
    return false;
  } else {
    throw new Error(`Action input '${inputName}' must be a boolean value`);
  }
}

export function getOptionalStringArrayInput(inputName: string): string[] {
  const inputString = getOptionalStringInput(inputName);

  return inputString ? parseCommaSeparated(inputString) : [];
}

export function getOptionalEnumArrayInput<TEnum extends string>(
  inputName: string,
  allowedValues: TEnum[],
): TEnum[] {
  const values = getOptionalStringArrayInput(inputName);

  const allowedValuesString = allowedValues as string[];
  for (const value of values) {
    if (allowedValuesString.indexOf(value) === -1) {
      throw new Error(
        `Action input '${inputName}' must be one of the following values: '${allowedValues.join(`', '`)}'`,
      );
    }
  }

  return values as TEnum[];
}

export function getOptionalDictionaryInput(
  inputName: string,
): Record<string, unknown> {
  const inputString = getOptionalStringInput(inputName);
  if (!inputString) {
    return {};
  }

  const jsonInput = tryParseJson(inputString);
  if (typeof jsonInput !== "object") {
    const keyValueInput = tryParseKeyValuePair(inputString);
    if (typeof keyValueInput === "object") {
      return keyValueInput;
    }

    throw new Error(`Action input '${inputName}' must be a valid JSON object or key value pair`);
  }

  return jsonInput;
}

export function getOptionalStringDictionaryInput(
  inputName: string,
): Record<string, string> {
  const input = getOptionalDictionaryInput(inputName);

  Object.keys(input).forEach(key => {
    if (typeof input[key] !== "string") {
      throw new Error(
        `Action input '${inputName}' must be a valid JSON object containing only string values`,
      );
    }
  });

  return input as Record<string, string>;
}

function getInput(
  inputName: string,
  allowedValues?: string[],
  throwOnMissing = true,
): string | undefined {
  const inputValue = core.getInput(inputName)?.trim();
  if (!inputValue) {
    if (throwOnMissing) {
      throw new Error(
        `Action input '${inputName}' is required but not provided`,
      );
    } else {
      return;
    }
  }

  if (allowedValues && !allowedValues.includes(inputValue)) {
    throw new Error(
      `Action input '${inputName}' must be one of the following values: '${allowedValues.join(`', '`)}'`,
    );
  }

  return inputValue;
}

function tryParseKeyValuePair(value: string) {
  const regex = /([^=\s]+)=({.*?}|[^=\s]+)/g;
  const result: Record<string, string | object> = {};

  let match;
  while ((match = regex.exec(value)) !== null) {
    const key = match[1].trim();
    let val = match[2].trim();

    if (val.startsWith('{') && val.endsWith('}')) {
      try {
        result[key] = JSON.stringify(JSON.parse(val));
      } catch (error) {
        result[key] = val;
      }
    } else {
      result[key] = val;
    }
  }

  if (Object.keys(result).length === 0) {
    return undefined;
  }

  return result;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function parseCommaSeparated(value: string) {
  return value
    .split(",")
    .map(val => val.trim())
    .filter(val => val.length > 0);
}
