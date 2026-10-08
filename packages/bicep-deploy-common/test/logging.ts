// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  Color,
  colorize,
  ExternalOutputLevel,
  ExternalOutputOptions,
  ExternalOutputSource,
  Logger,
} from "../src/logging";

const logWarningRaw = (message: string) => console.warn(message);
const logErrorRaw = (message: string) => console.error(message);

export class TestLogger implements Logger {
  public logs: { level: string; message: string }[] = [];
  public externalLogs: {
    level: ExternalOutputLevel;
    message: string;
    source: ExternalOutputSource;
  }[] = [];

  isDebugEnabled = () => true;
  debug = (message: string) => {
    this.logs.push({ level: "debug", message });
    console.debug(message);
  };
  logInfoRaw = (message: string) => {
    this.logs.push({ level: "info", message });
    console.info(message);
  };
  logInfo = (message: string) => this.logInfoRaw(colorize(message, Color.Blue));
  logExternalOutput = (message: string, options: ExternalOutputOptions) => {
    this.externalLogs.push({ message, ...options });
  };
  logWarning = (message: string) => {
    this.logs.push({ level: "warning", message });
    logWarningRaw(colorize(message, Color.Yellow));
  };
  logError = (message: string) => {
    this.logs.push({ level: "error", message });
    logErrorRaw(colorize(message, Color.Red));
  };

  clear() {
    this.logs = [];
    this.externalLogs = [];
  }

  getInfoMessages(): string[] {
    return this.logs.filter(l => l.level === "info").map(l => l.message);
  }

  getExternalMessages(
    source: ExternalOutputSource,
    level?: ExternalOutputLevel,
  ): string[] {
    return this.externalLogs
      .filter(log => log.source === source && (!level || log.level === level))
      .map(log => log.message);
  }
}
