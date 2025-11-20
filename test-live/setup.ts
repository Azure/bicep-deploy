// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as process from "process";

import { configureMocks } from "./actionCoreMocks";

import { run } from "../src/main";

type EnvironmentData = {
  subscriptionId: string;
  resourceGroup: string;
};

export async function runAction(getYaml: (data: EnvironmentData) => string) {
  expect(process.env.LIVETEST_SUBSCRIPTION_ID).toBeDefined();
  expect(process.env.LIVETEST_RESOURCE_GROUP).toBeDefined();

  const data: EnvironmentData = {
    subscriptionId: process.env.LIVETEST_SUBSCRIPTION_ID!,
    resourceGroup: process.env.LIVETEST_RESOURCE_GROUP!,
  };

  const result = configureMocks(getYaml(data));

  await run();

  return result;
}
