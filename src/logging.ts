// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as core from "@actions/core";
import { randomUUID } from "node:crypto";
import { EOL } from "node:os";

import {
  Color,
  colorize,
  ExternalOutputOptions,
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
  logExternalOutput = (
    message: string,
    options: ExternalOutputOptions,
  ): void => {
    void options.source;
    switch (options.level) {
      case "info": {
        const token = createExternalOutputToken(message);
        process.stdout.write(`::stop-commands::${token}${EOL}`);
        try {
          core.info(message);
        } finally {
          process.stdout.write(`::${token}::${EOL}`);
        }
        break;
      }
      case "debug":
        core.debug(message);
        break;
      case "warning":
        core.warning(message);
        break;
      case "error":
        core.error(message);
        break;
      default: {
        const exhaustiveCheck: never = options.level;
        return exhaustiveCheck;
      }
    }
  };
  logWarning = (message: string) =>
    logWarningRaw(colorize(message, Color.Yellow));
  logError = (message: string) => logErrorRaw(colorize(message, Color.Red));
}
