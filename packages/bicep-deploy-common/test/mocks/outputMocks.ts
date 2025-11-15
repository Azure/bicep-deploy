// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { OutputSetter } from "../../src/output";

export class mockOutputSetter implements OutputSetter {
  setOutput = jest.fn();
  setFailed = jest.fn();
  setSecret = jest.fn();
}