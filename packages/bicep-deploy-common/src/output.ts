// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeployConfig } from "./config";

export interface OutputSetter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOutput(name: string, value: any): void;
  setFailed(message: string | Error): void;
  setSecret(secret: string): void;
}

export function setOutputs(
  config: DeployConfig,
  outputSetter: OutputSetter,
  outputs?: Record<string, unknown>,
) {
  if (!outputs) {
    return;
  }

  for (const key of Object.keys(outputs)) {
    const output = outputs[key] as { value: string };
    outputSetter.setOutput(key, output.value);
    if (
      config.maskedOutputs &&
      config.maskedOutputs.some(x => x.toLowerCase() === key.toLowerCase())
    ) {
      outputSetter.setSecret(output.value);
    }
  }
}
