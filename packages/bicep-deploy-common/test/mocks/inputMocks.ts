// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import yaml from "yaml";

import { InputReader } from "../../src/input";

export class mockInputReader implements InputReader {
  getInput = vi.fn();
}

export function configureGetInputMock(
  inputs: Record<string, string>,
  inputReader: mockInputReader,
) {
  inputReader.getInput.mockImplementation(inputName => {
    return inputs[inputName];
  });
}

export function configureGetInputMockWithYaml(
  yamlInput: string,
  inputReader: mockInputReader,
) {
  configureGetInputMock(yaml.parse(yamlInput), inputReader);
}

export class TestInputParameterNames {
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
  // setting some with different casing
  managementGroupId = "managementGroupId";
  subscriptionId = "subscriptionId";
  resourceGroupName = "resourceGroupName";
}
