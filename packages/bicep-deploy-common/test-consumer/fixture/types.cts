// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  execute,
  type BicepCache,
  type DeploymentsConfig,
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

const publicContract = {
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

void publicContract;
void ({} as ConsumerContract);
