// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { OutputSetter } from "../../src/output";

export class mockOutputSetter implements OutputSetter {
  setOutput = vi.fn();
  setFailed = vi.fn();
  setSecret = vi.fn();
}
