// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as core from "@actions/core";

import {
  getTemplateAndParameters,
  parseConfig,
  execute,
} from "@azure/bicep-deploy-common";

import {
  ActionInputReader,
  ActionOutputSetter,
  ActionLogger,
} from "./actionIO";

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const inputReader = new ActionInputReader();
    const config = parseConfig(inputReader);
    const logger = new ActionLogger();
    const outputSetter = new ActionOutputSetter();
    logger.logInfo(`Action config: ${JSON.stringify(config, null, 2)}`);

    const files = await getTemplateAndParameters(config, logger);

    await execute(config, files, logger, outputSetter);
  } catch (error) {
    // Fail the workflow run if an error occurs
    const message = error instanceof Error ? error.message : `${error}`;
    core.setFailed(message);
  }
}
