// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface LoggingMessageConfig {
  diagnosticsReturned: string;
  bicepVersionInstalled: (version: string, path: string) => string;
  requestFailedCorrelation: (correlationId: string | null) => string;
}

const defaultLoggingMessages: LoggingMessageConfig = {
  diagnosticsReturned: "Diagnostics returned by the API",
  bicepVersionInstalled: (version: string, path: string) =>
    `Installed Bicep version ${version} to ${path}`,
  requestFailedCorrelation: (correlationId: string | null) =>
    `Request failed. CorrelationId: ${correlationId}`,
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
