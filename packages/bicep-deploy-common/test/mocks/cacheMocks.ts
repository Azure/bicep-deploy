// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { BicepCache } from "../../src/file";

export class mockBicepCache implements BicepCache {
  find = vi
    .fn<(version: string) => Promise<string | undefined>>()
    .mockResolvedValue(undefined);
  save = vi
    .fn<(installedPath: string, version: string) => Promise<string>>()
    .mockImplementation(async installedPath => installedPath);
}
