// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as core from "@actions/core";
import { randomUUID } from "node:crypto";
import { EOL } from "node:os";

import {
  Color,
  colorize,
  ExternalOutputSource,
  Logger,
} from "@azure/bicep-deploy-common";

const logWarningRaw = (message: string) => core.warning(message);
const logErrorRaw = (message: string) => core.error(message);

function createExternalOutputToken(message: string): string {
  let token = randomUUID();
  while (message.includes(`::${token}::`)) {
    token = randomUUID();
  }

  return token;
}

export class ActionLogger implements Logger {
  isDebugEnabled = () => core.isDebug();
  debug = (message: string) => core.debug(message);
  logInfoRaw = (message: string) => core.info(message);
  logInfo = (message: string) => this.logInfoRaw(colorize(message, Color.Blue));
  logExternalOutput = (message: string, source: ExternalOutputSource): void => {
    void source;
    const token = createExternalOutputToken(message);
    process.stdout.write(`::stop-commands::${token}${EOL}`);
    try {
      core.info(message);
    } finally {
      process.stdout.write(`::${token}::${EOL}`);
    }
  };
  logWarning = (message: string) =>
    logWarningRaw(colorize(message, Color.Yellow));
  logError = (message: string) => logErrorRaw(colorize(message, Color.Red));
}
