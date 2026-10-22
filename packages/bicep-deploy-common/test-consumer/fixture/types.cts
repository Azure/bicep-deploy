// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  execute,
  type BicepCache,
  type DeploymentsConfig,
  type ExternalOutputOptions,
  type Logger,
  type OutputOptions,
  type OutputSetter,
} from "@azure/bicep-deploy-common";
import {
  deploymentCreate,
  deploymentValidate,
  deploymentWhatIf,
} from "@azure/bicep-deploy-common/deployments";
import {
  stackCreate,
  stackDelete,
  stackValidate,
} from "@azure/bicep-deploy-common/stacks";
import {
  Bicep,
  type CompileRequest,
  type CompileResponse,
} from "@azure/bicep-rpc-client";

const publicContract = {
  Bicep,
  execute,
  deploymentCreate,
  deploymentValidate,
  deploymentWhatIf,
  stackCreate,
  stackDelete,
  stackValidate,
};

type ConsumerContract = {
  config: DeploymentsConfig;
  logger: Logger;
  outputSetter: OutputSetter;
  bicepCache: BicepCache;
};

type RpcConsumerContract = {
  request: CompileRequest;
  response: CompileResponse;
};

const logger: Logger = {
  isDebugEnabled: () => false,
  debug: () => undefined,
  logInfo: () => undefined,
  logWarning: () => undefined,
  logError: () => undefined,
  logExternalOutput: (_message, options: ExternalOutputOptions) => {
    const source: "remote" | "repository" | "childProcess" = options.source;
    const level: "info" | "debug" | "warning" | "error" = options.level;
    void source;
    void level;
  },
};

const outputSetter: OutputSetter = {
  setOutputVariable: (
    _name: string,
    _value: unknown,
    options: OutputOptions,
  ) => {
    const isSecret: boolean = options.isSecret;
    void isSecret;
  },
  setFailed: (message: string | Error) => {
    void message;
  },
};

// Mirrors the 0.4 adapter shape so the assignment below proves it no longer compiles.
const legacyOutputSetter = {
  setOutput: (name: string, value: unknown) => {
    void name;
    void value;
  },
  setFailed: (message: string | Error) => {
    void message;
  },
  setSecret: (secret: string) => {
    void secret;
  },
};

// @ts-expect-error The 0.4 adapter shape must not satisfy the 0.5 contract.
const rejectedLegacyOutputSetter: OutputSetter = legacyOutputSetter;

void publicContract;
void ({ logger, outputSetter } as ConsumerContract);
void rejectedLegacyOutputSetter;
void ({} as RpcConsumerContract);
