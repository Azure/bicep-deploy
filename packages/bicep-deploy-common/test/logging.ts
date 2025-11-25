// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { Color, colorize, Logger } from "../src/logging";

const logWarningRaw = (message: string) => console.warn(message);
const logErrorRaw = (message: string) => console.error(message);

export class TestLogger implements Logger {
  isDebugEnabled = () => true;
  debug = (message: string) => console.debug(message);
  logInfoRaw = (message: string) => console.info(message);
  logInfo = (message: string) => this.logInfoRaw(colorize(message, Color.Blue));
  logWarning = (message: string) =>
    logWarningRaw(colorize(message, Color.Yellow));
  logError = (message: string) => logErrorRaw(colorize(message, Color.Red));
}
