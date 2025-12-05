// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as core from "@actions/core";

import {
  InputReader,
  OutputSetter,
  InputParameterNames,
} from "@azure/bicep-deploy-common";

export class ActionInputReader implements InputReader {
  getInput = (inputName: string) => core.getInput(inputName);
}

export class ActionOutputSetter implements OutputSetter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOutput = (name: string, value: any) => core.setOutput(name, value);
  setFailed = (message: string) => core.setFailed(message);
  setSecret = (secret: string) => core.setSecret(secret);
}

export class ActionInputParameterNames implements InputParameterNames {
  type = "type";
  name = "name";
  location = "location";
  templateFile = "template-file";
  parametersFile = "parameters-file";
  parameters = "parameters";
  bicepVersion = "bicep-version";
  description = "description";
  tags = "tags";
  maskedOutputs = "masked-outputs";
  environment = "environment";
  operation = "operation";
  whatIfExcludeChangeTypes = "what-if-exclude-change-types";
  validationLevel = "validation-level";
  actionOnUnmanageResources = "action-on-unmanage-resources";
  actionOnUnmanageResourceGroups = "action-on-unmanage-resourcegroups";
  actionOnUnmanageManagementGroups = "action-on-unmanage-managementgroups";
  bypassStackOutOfSyncError = "bypass-stack-out-of-sync-error";
  denySettingsMode = "deny-settings-mode";
  denySettingsExcludedActions = "deny-settings-excluded-actions";
  denySettingsExcludedPrincipals = "deny-settings-excluded-principals";
  denySettingsApplyToChildScopes = "deny-settings-apply-to-child-scopes";
  scope = "scope";
  tenantId = "tenant-id";
  managementGroupId = "management-group-id";
  subscriptionId = "subscription-id";
  resourceGroupName = "resource-group-name";
}
