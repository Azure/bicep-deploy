// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as core from "@actions/core";

import { parseConfig } from "./config";
import { execute } from "./handler";
import { getTemplateAndParameters } from "./helpers/file";
import { logInfo } from "./helpers/logging";

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const config = parseConfig();
    logInfo(`Action config: ${JSON.stringify(config, null, 2)}`);

    const files = await getTemplateAndParameters(config);

    await execute(config, files);
  } catch (error) {
    // Fail the workflow run if an error occurs
    const message = error instanceof Error ? error.message : `${error}`;
    core.setFailed(message);
  }
}
