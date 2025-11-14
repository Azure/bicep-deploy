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
): DeploymentsConfig | DeploymentStackConfig {
  const type = getRequiredEnumInput(
    "type",
    ["deployment", "deploymentStack"],
    inputReader,
  );
  const name = getOptionalStringInput("name", inputReader);
  const location = getOptionalStringInput("location", inputReader);
  const templateFile = getOptionalFilePath("template-file", inputReader);
  const parametersFile = getOptionalFilePath("parameters-file", inputReader);
  const parameters = getOptionalDictionaryInput("parameters", inputReader);
  const bicepVersion = getOptionalStringInput("bicep-version", inputReader);
  const description = getOptionalStringInput("description", inputReader);
  const tags = getOptionalStringDictionaryInput("tags", inputReader);
  const maskedOutputs = getOptionalStringArrayInput(
    "masked-outputs",
    inputReader,
  );
  const environment =
    getOptionalEnumInput(
      "environment",
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
          "operation",
          ["create", "validate", "whatIf"],
          inputReader,
        ),
        scope: parseDeploymentScope(inputReader),
        whatIf: {
          excludeChangeTypes: getOptionalEnumArrayInput(
            "what-if-exclude-change-types",
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
          "validation-level",
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
          "operation",
          ["create", "validate", "delete"],
          inputReader,
        ),
        scope: parseDeploymentStackScope(inputReader),
        actionOnUnManage: {
          resources: getRequiredEnumInput(
            "action-on-unmanage-resources",
            ["delete", "detach"],
            inputReader,
          ),
          resourceGroups: getOptionalEnumInput(
            "action-on-unmanage-resourcegroups",
            ["delete", "detach"],
            inputReader,
          ),
          managementGroups: getOptionalEnumInput(
            "action-on-unmanage-managementgroups",
            ["delete", "detach"],
            inputReader,
          ),
        },
        bypassStackOutOfSyncError: getOptionalBooleanInput(
          "bypass-stack-out-of-sync-error",
          inputReader,
        ),
        denySettings: {
          mode: getRequiredEnumInput(
            "deny-settings-mode",
            ["denyDelete", "denyWriteAndDelete", "none"],
            inputReader,
          ),
          excludedActions: getOptionalStringArrayInput(
            "deny-settings-excluded-actions",
            inputReader,
          ),
          excludedPrincipals: getOptionalStringArrayInput(
            "deny-settings-excluded-principals",
            inputReader,
          ),
          applyToChildScopes: getOptionalBooleanInput(
            "deny-settings-apply-to-child-scopes",
            inputReader,
          ),
        },
      };
    }
  }
}

function parseDeploymentScope(
  inputReader: InputReader,
): TenantScope | ManagementGroupScope | SubscriptionScope | ResourceGroupScope {
  const type = getRequiredEnumInput(
    "scope",
    ["tenant", "managementGroup", "subscription", "resourceGroup"],
    inputReader,
  );
  const tenantId = getOptionalStringInput("tenant-id", inputReader);

  switch (type) {
    case "tenant": {
      return {
        type,
        tenantId,
      };
    }
    case "managementGroup": {
      const managementGroup = getRequiredStringInput(
        "management-group-id",
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
        "subscription-id",
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
        "subscription-id",
        inputReader,
      );
      const resourceGroup = getRequiredStringInput(
        "resource-group-name",
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
): ManagementGroupScope | SubscriptionScope | ResourceGroupScope {
  const type = getRequiredEnumInput(
    "scope",
    ["managementGroup", "subscription", "resourceGroup"],
    inputReader,
  );
  const tenantId = getOptionalStringInput("tenant-id", inputReader);

  switch (type) {
    case "managementGroup": {
      const managementGroup = getRequiredStringInput(
        "management-group-id",
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
        "subscription-id",
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
        "subscription-id",
        inputReader,
      );
      const resourceGroup = getRequiredStringInput(
        "resource-group-name",
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
