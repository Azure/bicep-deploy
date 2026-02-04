// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface LoggingMessageConfig {
  diagnosticsReturned: string;
  bicepVersionInstalled: (version: string, path: string) => string;
  requestFailedCorrelation: (correlationId: string | null) => string;
  filesIgnoredForDelete: string;
  startingOperation: (type: string, operation: string, scope: string, scopedId: string, name: string) => string;
  usingTemplateFile: (templateFile: string) => string;
  usingParametersFile: (parametersFile: string) => string;
}

const defaultLoggingMessages: LoggingMessageConfig = {
  diagnosticsReturned: "Diagnostics returned by the API",
  bicepVersionInstalled: (version: string, path: string) =>
    `Installed Bicep version ${version} to ${path}`,
  requestFailedCorrelation: (correlationId: string | null) =>
    `Request failed. CorrelationId: ${correlationId}`,
  filesIgnoredForDelete:
    "Template and parameter files are not required for delete operations and will be ignored.",
  startingOperation: (type: string, operation: string, scope: string, scopedId: string, name: string) =>
    `Starting ${type} ${operation} at ${scope}${scopedId ? ` '${scopedId}'` : ``} scope${name ? ` with name '${name}'` : ""}`,
  usingTemplateFile: (templateFile: string) =>
    `Using template file: ${templateFile}`,
  usingParametersFile: (parametersFile: string) =>
    `Using parameters file: ${parametersFile}`,
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
