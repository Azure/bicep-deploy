// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { OutputSetter } from "../../src/output";

export class mockOutputSetter implements OutputSetter {
  setOutputVariable = vi.fn();
  setFailed = vi.fn();
}
