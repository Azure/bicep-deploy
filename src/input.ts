// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as core from "@actions/core";

import { InputReader } from "../packages/bicep-deploy-common/src/input";

export class ActionInputReader implements InputReader {
  getInput = (inputName: string) => core.getInput(inputName);
}
