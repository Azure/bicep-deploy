// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface ErrorMessageConfig {
  // Handler errors
  createFailed: string;
  validationFailed: string;
  operationFailed: string;
  requestFailedCorrelation: (correlationId: string) => string;

  // Input errors
  inputMustBeBoolean: (inputName: string) => string;
  inputRequired: (inputName: string) => string;
  inputMustBeEnum: (inputName: string, allowedValues: string[]) => string;
  inputMustBeValidObject: (inputName: string) => string;
  inputMustBeStringObject: (inputName: string) => string;

  // Utils errors
  locationRequired: string;
  failedToDetermineScope: string;

  // File errors
  unsupportedParametersFile: (parametersFile: string) => string;
  unsupportedTemplateFile: (templateFile: string) => string;
  templateFileRequired: string;

  // WhatIf errors
  invalidChangeType: (changeType: string) => string;
  unknownPropertyChangeType: (propertyChangeType: string) => string;
  invalidJsonValue: (value: unknown) => string;
}

const defaultErrorMessages: ErrorMessageConfig = {
  // Handler errors
  createFailed: "Create failed",
  validationFailed: "Validation failed",
  operationFailed: "Operation failed",
  requestFailedCorrelation: (correlationId: string) =>
    `Request failed. CorrelationId: ${correlationId}`,

  // Input errors
  inputMustBeBoolean: (inputName: string) =>
    `Input '${inputName}' must be a boolean value`,
  inputRequired: (inputName: string) =>
    `Input '${inputName}' is required but not provided`,
  inputMustBeEnum: (inputName: string, allowedValues: string[]) =>
    `Input '${inputName}' must be one of the following values: '${allowedValues.join(`', '`)}'`,
  inputMustBeValidObject: (inputName: string) =>
    `Input '${inputName}' must be a valid JSON or YAML object`,
  inputMustBeStringObject: (inputName: string) =>
    `Input '${inputName}' must be a valid JSON or YAML object containing only string values`,

  // Utils errors
  locationRequired: "Location is required",
  failedToDetermineScope: `Failed to determine deployment scope from Bicep file.`,

  // File errors
  unsupportedParametersFile: (parametersFile: string) =>
    `Unsupported parameters file type: ${parametersFile}`,
  unsupportedTemplateFile: (templateFile: string) =>
    `Unsupported template file type: ${templateFile}`,
  templateFileRequired: "Template file is required",

  // WhatIf errors
  invalidChangeType: (changeType: string) =>
    `Invalid ChangeType: ${changeType}`,
  unknownPropertyChangeType: (propertyChangeType: string) =>
    `Unknown property change type: ${propertyChangeType}.`,
  invalidJsonValue: (value: unknown) => `Invalid JSON value: ${value}`,
};

let currentErrorMessages: ErrorMessageConfig = defaultErrorMessages;

export function setErrorMessages(
  customMessages: Partial<ErrorMessageConfig>,
): void {
  currentErrorMessages = { ...defaultErrorMessages, ...customMessages };
}

export function resetErrorMessages(): void {
  currentErrorMessages = defaultErrorMessages;
}

export const errorMessages: ErrorMessageConfig = new Proxy(
  {} as ErrorMessageConfig,
  {
    get: (_target, prop: string) => {
      return currentErrorMessages[prop as keyof ErrorMessageConfig];
    },
  },
);
