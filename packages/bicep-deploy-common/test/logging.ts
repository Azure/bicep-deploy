// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { Color, colorize, Logger } from "../src/logging";

const logWarningRaw = (message: string) => console.warn(message);
const logErrorRaw = (message: string) => console.error(message);

export class TestLogger implements Logger {
  public logs: { level: string; message: string }[] = [];

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
  }

  getInfoMessages(): string[] {
    return this.logs.filter(l => l.level === "info").map(l => l.message);
  }
}
