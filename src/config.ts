// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  getRequiredEnumInput,
  getOptionalStringInput,
  getOptionalStringDictionaryInput,
  getOptionalFilePath,
  getOptionalBooleanInput,
  getOptionalEnumInput,
  getOptionalStringArrayInput,
  getRequiredStringInput,
  getOptionalEnumArrayInput,
  getOptionalDictionaryInput,
} from "./helpers/input";

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
};

type CommonConfig = {
  type: "deployment" | "deploymentStack";
  name?: string;
  location?: string;
  tags?: Record<string, string>;
  maskedOutputs?: string[];
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
    excludeChangeTypes: WhatIfChangeType[];
  };
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
    excludedActions: string[];
    excludedPrincipals: string[];
  };
  bypassStackOutOfSyncError: boolean;
};

export type ActionConfig = DeploymentsConfig | DeploymentStackConfig;

export function parseConfig(): DeploymentsConfig | DeploymentStackConfig {
  const type = getRequiredEnumInput("type", ["deployment", "deploymentStack"]);
  const name = getOptionalStringInput("name");
  const location = getOptionalStringInput("location");
  const templateFile = getOptionalFilePath("template-file");
  const parametersFile = getOptionalFilePath("parameters-file");
  const parameters = getOptionalDictionaryInput("parameters");
  const description = getOptionalStringInput("description");
  const tags = getOptionalStringDictionaryInput("tags");
  const maskedOutputs = getOptionalStringArrayInput("masked-outputs");

  switch (type) {
    case "deployment": {
      return {
        type,
        name,
        location,
        templateFile,
        parametersFile,
        parameters,
        tags,
        maskedOutputs,
        operation: getRequiredEnumInput("operation", [
          "create",
          "validate",
          "whatIf",
        ]),
        scope: parseDeploymentScope(),
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
          ),
        },
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
        description,
        tags,
        maskedOutputs,
        operation: getRequiredEnumInput("operation", [
          "create",
          "validate",
          "delete",
        ]),
        scope: parseDeploymentStackScope(),
        actionOnUnManage: {
          resources: getRequiredEnumInput("action-on-unmanage-resources", [
            "delete",
            "detach",
          ]),
          resourceGroups: getOptionalEnumInput(
            "action-on-unmanage-resourcegroups",
            ["delete", "detach"],
          ),
          managementGroups: getOptionalEnumInput(
            "action-on-unmanage-managementgroups",
            ["delete", "detach"],
          ),
        },
        bypassStackOutOfSyncError: getOptionalBooleanInput(
          "bypass-stack-out-of-sync-error",
        ),
        denySettings: {
          mode: getRequiredEnumInput("deny-settings-mode", [
            "denyDelete",
            "denyWriteAndDelete",
            "none",
          ]),
          excludedActions: getOptionalStringArrayInput(
            "deny-settings-excluded-actions",
          ),
          excludedPrincipals: getOptionalStringArrayInput(
            "deny-settings-excluded-principals",
          ),
        },
      };
    }
  }
}

function parseDeploymentScope():
  | TenantScope
  | ManagementGroupScope
  | SubscriptionScope
  | ResourceGroupScope {
  const type = getRequiredEnumInput("scope", [
    "tenant",
    "managementGroup",
    "subscription",
    "resourceGroup",
  ]);
  const tenantId = getOptionalStringInput("tenant-id");

  switch (type) {
    case "tenant": {
      return {
        type,
        tenantId,
      };
    }
    case "managementGroup": {
      const managementGroup = getRequiredStringInput("management-group-id");
      return {
        type,
        tenantId,
        managementGroup,
      };
    }
    case "subscription": {
      const subscriptionId = getRequiredStringInput("subscription-id");
      return {
        type,
        tenantId,
        subscriptionId,
      };
    }
    case "resourceGroup": {
      const subscriptionId = getRequiredStringInput("subscription-id");
      const resourceGroup = getRequiredStringInput("resource-group-name");
      return {
        type,
        tenantId,
        subscriptionId,
        resourceGroup,
      };
    }
  }
}

function parseDeploymentStackScope():
  | ManagementGroupScope
  | SubscriptionScope
  | ResourceGroupScope {
  const type = getRequiredEnumInput("scope", [
    "managementGroup",
    "subscription",
    "resourceGroup",
  ]);
  const tenantId = getOptionalStringInput("tenant-id");

  switch (type) {
    case "managementGroup": {
      const managementGroup = getRequiredStringInput("management-group-id");
      return {
        type,
        tenantId,
        managementGroup,
      };
    }
    case "subscription": {
      const subscriptionId = getRequiredStringInput("subscription-id");
      return {
        type,
        tenantId,
        subscriptionId,
      };
    }
    case "resourceGroup": {
      const subscriptionId = getRequiredStringInput("subscription-id");
      const resourceGroup = getRequiredStringInput("resource-group-name");
      return {
        type,
        tenantId,
        subscriptionId,
        resourceGroup,
      };
    }
  }
}
