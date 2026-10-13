// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface ErrorMessageConfig {
  // Handler errors
  createFailed: string;
  validationFailed: string;
  whatIfFailed: string;
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
  parametersFileNotFound: (parametersFile: string) => string;
  unsupportedParametersFile: (parametersFile: string) => string;
  unsupportedTemplateFile: (templateFile: string) => string;
  templateFileRequired: string;
  failedToResolveBicepVersion: (url: string) => string;

  // Config chain errors
  configFileNotFound: (configPath: string) => string;
  configChainCycleDetected: (configPath: string) => string;
  configChainTooDeep: (maxDepth: number) => string;
  configChainAbsoluteExtendsPath: (
    extendsValue: string,
    configPath: string,
  ) => string;
  invalidConfigExtendsValue: (configPath: string) => string;
  invalidBicepVersionConstraintType: (configPath: string) => string;
  unparsableBicepVersionConstraint: (
    versionValue: string,
    configPath: string,
  ) => string;
  unsatisfiableBicepVersionConstraint: (
    versionValue: string,
    configPath: string,
  ) => string;
  bicepVersionConflictsWithConfigChain: (
    requestedVersion: string,
    constraint: string,
    configPath: string,
  ) => string;
  noReleaseSatisfiesBicepVersionConstraint: (
    constraint: string,
    configPath: string,
  ) => string;

  // WhatIf errors
  invalidChangeType: (changeType: string) => string;
  unknownPropertyChangeType: (propertyChangeType: string) => string;
  invalidJsonValue: (value: unknown) => string;
}

const defaultErrorMessages: ErrorMessageConfig = {
  // Handler errors
  createFailed: "Create failed",
  validationFailed: "Validation failed",
  whatIfFailed: "What-if failed",
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
  parametersFileNotFound: (parametersFile: string) =>
    `Parameters file not found: ${parametersFile}`,
  unsupportedParametersFile: (parametersFile: string) =>
    `Unsupported parameters file type: ${parametersFile}`,
  unsupportedTemplateFile: (templateFile: string) =>
    `Unsupported template file type: ${templateFile}`,
  templateFileRequired: "Template file is required",
  failedToResolveBicepVersion: (url: string) =>
    `Failed to resolve Bicep version from download URL: ${url}`,

  // Config chain errors
  configFileNotFound: (configPath: string) =>
    `Config file not found: ${configPath}`,
  configChainCycleDetected: (configPath: string) =>
    `Cycle detected while resolving "extends" chain at: ${configPath}`,
  configChainTooDeep: (maxDepth: number) =>
    `The "extends" chain exceeds the maximum supported depth of ${maxDepth}.`,
  configChainAbsoluteExtendsPath: (extendsValue: string, configPath: string) =>
    `The "extends" property in ${configPath} must be a relative path, but got an absolute path: ${extendsValue}`,
  invalidConfigExtendsValue: (configPath: string) =>
    `The "extends" property in ${configPath} must be a string.`,
  invalidBicepVersionConstraintType: (configPath: string) =>
    `The "bicep.version" property in ${configPath} must be a string.`,
  unparsableBicepVersionConstraint: (
    versionValue: string,
    configPath: string,
  ) =>
    `The "bicep.version" property "${versionValue}" in ${configPath} is not a valid Bicep version or version range.`,
  unsatisfiableBicepVersionConstraint: (
    versionValue: string,
    configPath: string,
  ) =>
    `The "bicep.version" constraint "${versionValue}" in ${configPath} can never be satisfied by any version.`,
  bicepVersionConflictsWithConfigChain: (
    requestedVersion: string,
    constraint: string,
    configPath: string,
  ) =>
    `The requested Bicep version "${requestedVersion}" does not satisfy the "bicep.version" constraint "${constraint}" declared in ${configPath}.`,
  noReleaseSatisfiesBicepVersionConstraint: (
    constraint: string,
    configPath: string,
  ) =>
    `No published Bicep CLI release satisfies the "bicep.version" constraint "${constraint}" declared in ${configPath}.`,

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
