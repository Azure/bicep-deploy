// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as core from "@actions/core";
import { Color, colorize, Logger } from "./common/logging";

const logWarningRaw = (message: string) => core.warning(message);
const logErrorRaw = (message: string) => core.error(message);

export class ActionLogger implements Logger {
  logInfoRaw = (message: string) => core.info(message);
  logInfo = (message: string) => this.logInfoRaw(colorize(message, Color.Blue));
  logWarning = (message: string) =>
    logWarningRaw(colorize(message, Color.Yellow));
  logError = (message: string) => logErrorRaw(colorize(message, Color.Red));
}
