// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { DeployConfig } from "./config";

export interface OutputOptions {
  isSecret: boolean;
}

export interface OutputSetter {
  // Distinct from the 0.4 setOutput name so older adapters fail to compile instead of ignoring isSecret.
  setOutputVariable(name: string, value: unknown, options: OutputOptions): void;
  setFailed(message: string | Error): void;
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
    const output = outputs[key] as { value: unknown };
    const isSecret =
      config.maskedOutputs?.some(
        outputName => outputName.toLowerCase() === key.toLowerCase(),
      ) ?? false;
    outputSetter.setOutputVariable(key, output.value, { isSecret });
  }
}
