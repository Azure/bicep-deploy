// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  getRequiredEnumInput,
  getRequiredStringInput,
  getOptionalStringInput,
  getOptionalStringDictionaryInput,
  getOptionalFilePath,
  getOptionalEnumInput,
  getOptionalStringArrayInput,
  getOptionalEnumArrayInput,
  getOptionalDictionaryInput,
  getOptionalBooleanInput,
  InputReader,
  InputParameterNames,
} from "./input";

export type ScopeType =
  | "tenant"
  | "managementGroup"
  | "subscription"
  | "resourceGroup";

type CommonScope = {
  type: ScopeType;
  tenantId?: string;
};

export type TenantScope = CommonScope & {
  type: "tenant";
};

export type ManagementGroupScope = CommonScope & {
  type: "managementGroup";
  managementGroup: string;
};

export type SubscriptionScope = CommonScope & {
  type: "subscription";
  subscriptionId: string;
};

export type ResourceGroupScope = CommonScope & {
  type: "resourceGroup";
  subscriptionId: string;
  resourceGroup: string;
};

export type FileConfig = {
  templateFile?: string;
  parametersFile?: string;
  parameters?: Record<string, unknown>;
  bicepVersion?: string;
};

type CommonConfig = {
  type: "deployment" | "deploymentStack";
  name?: string;
  location?: string;
  tags?: Record<string, string>;
  maskedOutputs?: string[];
  environment:
    | "azureCloud"
    | "azureChinaCloud"
    | "azureGermanCloud"
    | "azureUSGovernment";
} & FileConfig;

type WhatIfChangeType =
  | "create"
  | "delete"
  | "modify"
  | "deploy"
  | "noChange"
  | "ignore"
  | "unsupported";

export type DeploymentsConfig = CommonConfig & {
  type: "deployment";
  operation: "create" | "validate" | "whatIf";
  scope:
    | TenantScope
    | ManagementGroupScope
    | SubscriptionScope
    | ResourceGroupScope;
  whatIf: {
    excludeChangeTypes?: WhatIfChangeType[];
  };
  validationLevel?: "provider" | "template" | "providerNoRbac";
};

export type DeploymentStackConfig = CommonConfig & {
  type: "deploymentStack";
  operation: "create" | "delete" | "validate";
  scope: ManagementGroupScope | SubscriptionScope | ResourceGroupScope;
  description?: string;
  actionOnUnManage: {
    resources: "delete" | "detach";
    managementGroups?: "delete" | "detach";
    resourceGroups?: "delete" | "detach";
  };
  denySettings: {
    mode: "denyDelete" | "denyWriteAndDelete" | "none";
    excludedActions?: string[];
    excludedPrincipals?: string[];
    applyToChildScopes?: boolean;
  };
  bypassStackOutOfSyncError: boolean;
};

export type DeployConfig = DeploymentsConfig | DeploymentStackConfig;

export function parseConfig(
  inputReader: InputReader,
  inputParameterNames: InputParameterNames,
): DeploymentsConfig | DeploymentStackConfig {
  const type = getRequiredEnumInput(
    inputParameterNames.type,
    ["deployment", "deploymentStack"],
    inputReader,
  );
  const name = getOptionalStringInput(inputParameterNames.name, inputReader);
  const location = getOptionalStringInput(
    inputParameterNames.location,
    inputReader,
  );
  const templateFile = getOptionalFilePath(
    inputParameterNames.templateFile,
    inputReader,
  );
  const parametersFile = getOptionalFilePath(
    inputParameterNames.paramtersFile,
    inputReader,
  );
  const parameters = getOptionalDictionaryInput(
    inputParameterNames.parameters,
    inputReader,
  );
  const bicepVersion = getOptionalStringInput(
    inputParameterNames.bicepVersion,
    inputReader,
  );
  const description = getOptionalStringInput(
    inputParameterNames.description,
    inputReader,
  );
  const tags = getOptionalStringDictionaryInput(
    inputParameterNames.tags,
    inputReader,
  );
  const maskedOutputs = getOptionalStringArrayInput(
    inputParameterNames.maskedOutputs,
    inputReader,
  );
  const environment =
    getOptionalEnumInput(
      inputParameterNames.environment,
      [
        "azureCloud",
        "azureChinaCloud",
        "azureGermanCloud",
        "azureUSGovernment",
      ],
      inputReader,
    ) ?? "azureCloud";

  switch (type) {
    case "deployment": {
      return {
        type,
        name,
        location,
        templateFile,
        parametersFile,
        parameters,
        bicepVersion,
        tags,
        maskedOutputs,
        environment: environment,
        operation: getRequiredEnumInput(
          inputParameterNames.operation,
          ["create", "validate", "whatIf"],
          inputReader,
        ),
        scope: parseDeploymentScope(inputReader, inputParameterNames),
        whatIf: {
          excludeChangeTypes: getOptionalEnumArrayInput(
            inputParameterNames.whatIfExcludeChangeTypes,
            [
              "create",
              "delete",
              "modify",
              "deploy",
              "noChange",
              "ignore",
              "unsupported",
            ],
            inputReader,
          ),
        },
        validationLevel: getOptionalEnumInput(
          inputParameterNames.validationLevel,
          ["provider", "template", "providerNoRbac"],
          inputReader,
        ),
      };
    }
    case "deploymentStack": {
      return {
        type,
        name,
        location,
        templateFile,
        parametersFile,
        parameters,
        bicepVersion,
        description,
        tags,
        maskedOutputs,
        environment: environment,
        operation: getRequiredEnumInput(
          inputParameterNames.operation,
          ["create", "validate", "delete"],
          inputReader,
        ),
        scope: parseDeploymentStackScope(inputReader, inputParameterNames),
        actionOnUnManage: {
          resources: getRequiredEnumInput(
            inputParameterNames.actionOnUnmanageResources,
            ["delete", "detach"],
            inputReader,
          ),
          resourceGroups: getOptionalEnumInput(
            inputParameterNames.actionOnUnmanageResourceGroups,
            ["delete", "detach"],
            inputReader,
          ),
          managementGroups: getOptionalEnumInput(
            inputParameterNames.actionOnUnmanageManagementGroups,
            ["delete", "detach"],
            inputReader,
          ),
        },
        bypassStackOutOfSyncError: getOptionalBooleanInput(
          inputParameterNames.bypasStackOutOfSyncError,
          inputReader,
        ),
        denySettings: {
          mode: getRequiredEnumInput(
            inputParameterNames.denySettingsMode,
            ["denyDelete", "denyWriteAndDelete", "none"],
            inputReader,
          ),
          excludedActions: getOptionalStringArrayInput(
            inputParameterNames.denySettingsExcludedActions,
            inputReader,
          ),
          excludedPrincipals: getOptionalStringArrayInput(
            inputParameterNames.denySettingsExcludedPrincipals,
            inputReader,
          ),
          applyToChildScopes: getOptionalBooleanInput(
            inputParameterNames.denySettingsApplyToChildScopes,
            inputReader,
          ),
        },
      };
    }
  }
}

function parseDeploymentScope(
  inputReader: InputReader,
  inputParameterNames: InputParameterNames,
): TenantScope | ManagementGroupScope | SubscriptionScope | ResourceGroupScope {
  const type = getRequiredEnumInput(
    inputParameterNames.scope,
    ["tenant", "managementGroup", "subscription", "resourceGroup"],
    inputReader,
  );
  const tenantId = getOptionalStringInput(
    inputParameterNames.tenantId,
    inputReader,
  );

  switch (type) {
    case "tenant": {
      return {
        type,
        tenantId,
      };
    }
    case "managementGroup": {
      const managementGroup = getRequiredStringInput(
        inputParameterNames.managementGroupId,
        inputReader,
      );
      return {
        type,
        tenantId,
        managementGroup,
      };
    }
    case "subscription": {
      const subscriptionId = getRequiredStringInput(
        inputParameterNames.subscriptionId,
        inputReader,
      );
      return {
        type,
        tenantId,
        subscriptionId,
      };
    }
    case "resourceGroup": {
      const subscriptionId = getRequiredStringInput(
        inputParameterNames.subscriptionId,
        inputReader,
      );
      const resourceGroup = getRequiredStringInput(
        inputParameterNames.resourceGroupName,
        inputReader,
      );
      return {
        type,
        tenantId,
        subscriptionId,
        resourceGroup,
      };
    }
  }
}

function parseDeploymentStackScope(
  inputReader: InputReader,
  inputParameterNames: InputParameterNames,
): ManagementGroupScope | SubscriptionScope | ResourceGroupScope {
  const type = getRequiredEnumInput(
    inputParameterNames.scope,
    ["managementGroup", "subscription", "resourceGroup"],
    inputReader,
  );
  const tenantId = getOptionalStringInput(
    inputParameterNames.tenantId,
    inputReader,
  );

  switch (type) {
    case "managementGroup": {
      const managementGroup = getRequiredStringInput(
        inputParameterNames.managementGroupId,
        inputReader,
      );
      return {
        type,
        tenantId,
        managementGroup,
      };
    }
    case "subscription": {
      const subscriptionId = getRequiredStringInput(
        inputParameterNames.subscriptionId,
        inputReader,
      );
      return {
        type,
        tenantId,
        subscriptionId,
      };
    }
    case "resourceGroup": {
      const subscriptionId = getRequiredStringInput(
        inputParameterNames.subscriptionId,
        inputReader,
      );
      const resourceGroup = getRequiredStringInput(
        inputParameterNames.resourceGroupName,
        inputReader,
      );
      return {
        type,
        tenantId,
        subscriptionId,
        resourceGroup,
      };
    }
  }
}
