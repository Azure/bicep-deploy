// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface LoggingMessageConfig {
  diagnosticsReturned: string;
  bicepCacheHit: (version: string, path: string) => string;
  bicepDownloading: (version: string) => string;
  requestFailedCorrelation: (correlationId: string | null) => string;
  filesIgnoredForDelete: string;
  startingOperation: (
    type: string,
    operation: string,
    scope: string,
    scopedId: string,
    name: string,
  ) => string;
  usingTemplateFile: (templateFile: string) => string;
  usingParametersFile: (parametersFile: string) => string;
  bicepVersionResolvedFromConfigChain: (
    version: string,
    constraint: string,
    configPath: string,
  ) => string;
  bicepVersionConstraintCouldNotBeChecked: (
    requestedVersion: string,
    constraint: string,
    configPath: string,
  ) => string;
}

const defaultLoggingMessages: LoggingMessageConfig = {
  diagnosticsReturned: "Diagnostics returned by the API",
  bicepCacheHit: (version: string, path: string) =>
    `Using cached Bicep version ${version} from ${path}`,
  bicepDownloading: (version: string) =>
    `Downloading Bicep version ${version}...`,
  requestFailedCorrelation: (correlationId: string | null) =>
    `Request failed. CorrelationId: ${correlationId}`,
  filesIgnoredForDelete:
    "Template and parameter files are not required for delete operations and will be ignored.",
  startingOperation: (
    type: string,
    operation: string,
    scope: string,
    scopedId: string,
    name: string,
  ) =>
    `Starting ${type} ${operation} at ${scope}${scopedId ? ` '${scopedId}'` : ""} scope${name ? ` with name '${name}'` : ""}`,
  usingTemplateFile: (templateFile: string) =>
    `Using template file: ${templateFile}`,
  usingParametersFile: (parametersFile: string) =>
    `Using parameters file: ${parametersFile}`,
  bicepVersionResolvedFromConfigChain: (
    version: string,
    constraint: string,
    configPath: string,
  ) =>
    `Resolved Bicep version ${version} to satisfy the "bicep.version" constraint "${constraint}" declared in ${configPath}`,
  bicepVersionConstraintCouldNotBeChecked: (
    requestedVersion: string,
    constraint: string,
    configPath: string,
  ) =>
    `Could not verify that the requested Bicep version "${requestedVersion}" satisfies the "bicep.version" constraint "${constraint}" declared in ${configPath}, because "${requestedVersion}" is not a recognized version number.`,
};

let currentLoggingMessages: LoggingMessageConfig = {
  ...defaultLoggingMessages,
};

export function setLoggingMessages(
  customMessages: Partial<LoggingMessageConfig>,
): void {
  currentLoggingMessages = {
    ...defaultLoggingMessages,
    ...customMessages,
  };
}

export function resetLoggingMessages(): void {
  currentLoggingMessages = { ...defaultLoggingMessages };
}

export const loggingMessages = new Proxy({} as LoggingMessageConfig, {
  get: (_target, prop: keyof LoggingMessageConfig) => {
    return currentLoggingMessages[prop];
  },
});
