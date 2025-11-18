// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as yaml from "yaml";

import { resolvePath } from "./file";

export interface InputReader {
  getInput(inputName: string): string | undefined;
}

export interface InputParameterNames {
  type: string;
  name: string;
  location: string;
  templateFile: string;
  paramtersFile: string;
  parameters: string;
  bicepVersion: string;
  description: string;
  tags: string;
  maskedOutputs: string;
  environment: string;
  operation: string;
  whatIfExcludeChangeTypes: string;
  validationLevel: string;
  actionOnUnmanageResources: string;
  actionOnUnmanageResourceGroups: string;
  actionOnUnmanageManagementGroups: string;
  bypasStackOutOfSyncError: string;
  denySettingsMode: string;
  denySettingsExcludedActions: string;
  denySettingsExcludedPrincipals: string;
  denySettingsApplyToChildScopes: string;
  scope: string;
  tenantId: string;
  managementGroupId: string;
  subscriptionId: string;
  resourceGroupName: string;
}


export function getRequiredStringInput(
  inputName: string,
  inputReader: InputReader,
): string {
  return getInput(inputName, inputReader, undefined, true) as string;
}

export function getOptionalStringInput(
  inputName: string,
  inputReader: InputReader,
): string | undefined {
  return getInput(inputName, inputReader, undefined, false);
}

export function getRequiredEnumInput<TEnum extends string>(
  inputName: string,
  allowedValues: TEnum[],
  inputReader: InputReader,
): TEnum {
  return getInput(inputName, inputReader, allowedValues, true) as TEnum;
}

export function getOptionalEnumInput<TEnum extends string>(
  inputName: string,
  allowedValues: TEnum[],
  inputReader: InputReader,
): TEnum | undefined {
  return getInput(inputName, inputReader, allowedValues, false) as
    | TEnum
    | undefined;
}

export function getOptionalFilePath(
  inputName: string,
  inputReader: InputReader,
): string | undefined {
  const input = getOptionalStringInput(inputName, inputReader);
  if (!input) {
    return;
  }

  return resolvePath(input);
}

export function getOptionalBooleanInput(
  inputName: string,
  inputReader: InputReader,
): boolean {
  const input = getOptionalStringInput(inputName, inputReader);
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

export function getOptionalStringArrayInput(
  inputName: string,
  inputReader: InputReader,
): string[] | undefined {
  const inputString = getOptionalStringInput(inputName, inputReader);

  return inputString ? parseCommaSeparated(inputString) : undefined;
}

export function getOptionalEnumArrayInput<TEnum extends string>(
  inputName: string,
  allowedValues: TEnum[],
  inputReader: InputReader,
): TEnum[] | undefined {
  const values = getOptionalStringArrayInput(inputName, inputReader);
  if (!values) {
    return undefined;
  }

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
  inputReader: InputReader,
): Record<string, unknown> | undefined {
  const inputString = getOptionalStringInput(inputName, inputReader);
  if (!inputString) {
    return undefined;
  }

  const input = tryParseJson(inputString) ?? tryParseYaml(inputString);
  if (typeof input !== "object") {
    throw new Error(
      `Action input '${inputName}' must be a valid JSON or YAML object`,
    );
  }

  return input;
}

export function getOptionalStringDictionaryInput(
  inputName: string,
  inputReader: InputReader,
): Record<string, string> | undefined {
  const input = getOptionalDictionaryInput(inputName, inputReader);
  if (!input) {
    return undefined;
  }

  Object.keys(input).forEach(key => {
    if (typeof input[key] !== "string") {
      throw new Error(
        `Action input '${inputName}' must be a valid JSON or YAML object containing only string values`,
      );
    }
  });

  return input as Record<string, string>;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function tryParseYaml(value: string) {
  try {
    return yaml.parse(value);
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

function getInput(
  inputName: string,
  inputReader: InputReader,
  allowedValues?: string[],
  throwOnMissing = true,
): string | undefined {
  const inputValue = inputReader.getInput(inputName)?.trim();
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
