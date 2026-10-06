// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  execute,
  type BicepCache,
  type DeploymentsConfig,
  type ExternalOutputOptions,
  type Logger,
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

void publicContract;
void ({ logger } as ConsumerContract);
void ({} as RpcConsumerContract);
