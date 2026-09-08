// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  DeploymentStacksChangeBase,
  DeploymentStacksChangeDeltaDenySettings,
  DeploymentStacksWhatIfChange,
  DeploymentStacksWhatIfPropertyChange,
  DeploymentStacksWhatIfResourceChange,
} from "@azure/arm-resourcesdeploymentstacks";
import { PropertyChangeType, WhatIfPropertyChange } from "@azure/arm-resources";
import { Color, ColorMode, ColorStringBuilder } from "./logging";
import { errorMessages } from "./errorMessages";
import {
  entries,
  formatIndent,
  formatJsonValue,
  formatPath,
  formatPropertyChanges,
  groupBy,
  sortChanges,
} from "./whatif";

// Modeled after the Azure CLI's deployment stack What-If formatter:
// https://github.com/Azure/azure-cli/blob/main/src/azure-cli/azure/cli/command_modules/resource/_stacks_formatters.py

type StackChangeType =
  | "create"
  | "delete"
  | "detach"
  | "modify"
  | "noChange"
  | "unsupported";

enum Symbol {
  WhiteSpace = " ",
  LeftSquareBracket = "[",
  RightSquareBracket = "]",
  Plus = "+",
  Minus = "-",
  Tilde = "~",
  Equal = "=",
  Asterisk = "*",
  Cross = "x",
}

const changeTypeToColor: Record<StackChangeType, Color> = {
  create: Color.Green,
  delete: Color.Red,
  detach: Color.Yellow,
  modify: Color.Magenta,
  noChange: Color.Reset,
  unsupported: Color.White,
};

const changeTypeToSymbol: Record<StackChangeType, Symbol> = {
  create: Symbol.Plus,
  delete: Symbol.Minus,
  detach: Symbol.Asterisk,
  modify: Symbol.Tilde,
  noChange: Symbol.Equal,
  unsupported: Symbol.Cross,
};

const changeTypeToWeight: Record<StackChangeType, number> = {
  delete: 0,
  create: 1,
  detach: 2,
  modify: 3,
  noChange: 4,
  unsupported: 5,
};

export function formatDeploymentStacksWhatIfChange(
  whatIfChange: DeploymentStacksWhatIfChange,
  colorMode: ColorMode,
): string {
  const builder = new ColorStringBuilder(colorMode);
  formatNoiseNotice(builder);
  formatChangeTypeLegend(builder, whatIfChange);
  formatStackLevelChanges(builder, whatIfChange);
  formatResourceChanges(builder, whatIfChange.resourceChanges ?? []);
  formatResourceChangesStats(builder, whatIfChange.resourceChanges ?? []);
  return builder.build();
}

export function stackWhatIfHasChanges(
  whatIfChange: DeploymentStacksWhatIfChange,
): boolean {
  const hasResourceChanges = (whatIfChange.resourceChanges ?? []).some(
    resourceChange => resourceChange.changeType !== "noChange",
  );

  return (
    hasResourceChanges ||
    hasDenySettingsChange(whatIfChange.denySettingsChange) ||
    hasDeploymentScopeChange(whatIfChange.deploymentScopeChange)
  );
}

function hasDenySettingsChange(
  denySettingsChange?: DeploymentStacksChangeDeltaDenySettings,
): boolean {
  return (denySettingsChange?.delta ?? []).length > 0;
}

function hasDeploymentScopeChange(
  deploymentScopeChange?: DeploymentStacksChangeBase,
): boolean {
  return (
    !!deploymentScopeChange &&
    deploymentScopeChange.before !== deploymentScopeChange.after
  );
}

function formatNoiseNotice(builder: ColorStringBuilder): void {
  builder.appendLine(`Note: The result may contain false positive predictions (noise).
You can help us improve the accuracy of the result by opening an issue here: https://aka.ms/WhatIfIssues`);
  builder.appendLine();
}

function formatChangeTypeLegend(
  builder: ColorStringBuilder,
  whatIfChange: DeploymentStacksWhatIfChange,
): void {
  const resourceChanges = whatIfChange.resourceChanges ?? [];
  const changeTypeSet = new Set<StackChangeType>();

  for (const resourceChange of resourceChanges) {
    changeTypeSet.add(resourceChange.changeType as StackChangeType);
  }

  if (hasDenySettingsChange(whatIfChange.denySettingsChange)) {
    changeTypeSet.add("modify");
  }

  if (hasDeploymentScopeChange(whatIfChange.deploymentScopeChange)) {
    changeTypeSet.add("modify");
  }

  if (!changeTypeSet.size) return;

  const changeTypes = Array.from(changeTypeSet).sort(
    (a, b) => changeTypeToWeight[a] - changeTypeToWeight[b],
  );

  builder.append("Resource and property changes are indicated with ");
  builder.appendLine(
    changeTypes.length === 1 ? "this symbol:" : "these symbols:",
  );

  for (const changeType of changeTypes) {
    const changeTypeSymbol = changeTypeToSymbol[changeType];
    const changeTypeColor = changeTypeToColor[changeType];
    formatIndent(builder);
    builder.append(changeTypeSymbol, changeTypeColor).append(Symbol.WhiteSpace);
    builder.appendLine(
      changeType.charAt(0).toUpperCase() + changeType.slice(1),
    );
  }
}

function formatStackLevelChanges(
  builder: ColorStringBuilder,
  whatIfChange: DeploymentStacksWhatIfChange,
): void {
  const denySettingsDelta = whatIfChange.denySettingsChange?.delta ?? [];
  const deploymentScopeChange = whatIfChange.deploymentScopeChange;
  const hasScopeChange = hasDeploymentScopeChange(deploymentScopeChange);

  if (!denySettingsDelta.length && !hasScopeChange) return;

  builder.appendLine().appendLine("The deployment stack settings will change:");

  if (hasScopeChange && deploymentScopeChange) {
    builder.appendLine();
    formatIndent(builder, 1);
    builder
      .append("deploymentScope", changeTypeToColor.modify)
      .append(Symbol.WhiteSpace);
    builder.append(deploymentScopeChange.before ?? "(none)");
    builder.append(" => ");
    builder.appendLine(deploymentScopeChange.after ?? "(none)");
  }

  if (denySettingsDelta.length) {
    builder.appendLine();
    builder.withColorScope(Color.Reset, () => {
      formatPropertyChanges(
        builder,
        sortChanges(denySettingsDelta.map(toWhatIfPropertyChange)),
        1,
      );
    });
  }
}

function formatResourceChanges(
  builder: ColorStringBuilder,
  resourceChanges: DeploymentStacksWhatIfResourceChange[],
): void {
  if (!resourceChanges.length) return;

  builder.appendLine();
  builder.appendLine(
    "The deployment stack will update the following resources:",
  );

  const sortedResourceChanges = resourceChanges
    .slice()
    .sort(
      (a, b) =>
        changeTypeToWeight[a.changeType as StackChangeType] -
          changeTypeToWeight[b.changeType as StackChangeType] ||
        getResourceLabel(a).localeCompare(getResourceLabel(b)),
    );

  const grouped = groupBy(
    sortedResourceChanges,
    x => x.changeType as StackChangeType,
  );

  for (const [changeType, resourceChangesForType] of entries(grouped)) {
    builder.withColorScope(changeTypeToColor[changeType], () => {
      for (const resourceChange of resourceChangesForType) {
        formatResourceChange(builder, resourceChange);
      }
    });
  }
}

function formatResourceChange(
  builder: ColorStringBuilder,
  resourceChange: DeploymentStacksWhatIfResourceChange,
): void {
  const changeType = resourceChange.changeType as StackChangeType;
  const label = getResourceLabel(resourceChange);

  builder.appendLine();
  formatPath(
    builder,
    label,
    0,
    1,
    b => formatResourceChangeType(b, changeType),
    b => formatApiVersion(b, resourceChange.apiVersion),
  );

  if (resourceChange.changeCertainty === "potential") {
    builder.withColorScope(Color.Reset, () => {
      builder.appendLine();
      formatIndent(builder, 2);
      builder.append(
        "(This change is not guaranteed to happen, depending on deployment-time conditions.)",
      );
    });
  }

  formatManagementStatusChange(builder, resourceChange);
  formatDenyStatusChange(builder, resourceChange);

  const configurationChanges = resourceChange.resourceConfigurationChanges;

  if (changeType === "create" && configurationChanges?.after) {
    formatJsonValue(
      builder,
      configurationChanges.after,
      undefined,
      undefined,
      2,
    );
  } else if (
    (changeType === "delete" || changeType === "detach") &&
    configurationChanges?.before
  ) {
    formatJsonValue(
      builder,
      configurationChanges.before,
      undefined,
      undefined,
      2,
    );
  } else if (configurationChanges?.delta?.length) {
    builder.withColorScope(Color.Reset, () => {
      builder.appendLine();
      formatPropertyChanges(
        builder,
        sortChanges(configurationChanges.delta!.map(toWhatIfPropertyChange)),
      );
    });
  } else {
    builder.appendLine();
  }
}

function formatManagementStatusChange(
  builder: ColorStringBuilder,
  resourceChange: DeploymentStacksWhatIfResourceChange,
): void {
  const managementStatusChange = resourceChange.managementStatusChange;
  if (
    !managementStatusChange ||
    managementStatusChange.before === managementStatusChange.after
  ) {
    return;
  }

  builder.withColorScope(Color.Reset, () => {
    builder.appendLine();
    formatIndent(builder, 2);
    builder.append(
      `management status: ${managementStatusChange.before ?? "(none)"} => ${managementStatusChange.after ?? "(none)"}`,
    );
  });
}

function formatDenyStatusChange(
  builder: ColorStringBuilder,
  resourceChange: DeploymentStacksWhatIfResourceChange,
): void {
  const denyStatusChange = resourceChange.denyStatusChange;
  if (!denyStatusChange || denyStatusChange.before === denyStatusChange.after) {
    return;
  }

  builder.withColorScope(Color.Reset, () => {
    builder.appendLine();
    formatIndent(builder, 2);
    builder.append(
      `deny status: ${denyStatusChange.before ?? "(none)"} => ${denyStatusChange.after ?? "(none)"}`,
    );
  });
}

function formatResourceChangeType(
  builder: ColorStringBuilder,
  changeType: StackChangeType,
): void {
  const changeSymbol = changeTypeToSymbol[changeType];
  builder.append(changeSymbol).append(Symbol.WhiteSpace);
}

function formatApiVersion(
  builder: ColorStringBuilder,
  apiVersion?: string,
): void {
  if (!apiVersion) return;

  builder.withColorScope(Color.Reset, () => {
    builder.append(Symbol.WhiteSpace);
    builder.append(Symbol.LeftSquareBracket);
    builder.append(apiVersion);
    builder.append(Symbol.RightSquareBracket);
  });
}

function getResourceLabel(
  resourceChange: DeploymentStacksWhatIfResourceChange,
): string {
  if (resourceChange.extension) {
    const identifiers = resourceChange.identifiers
      ? JSON.stringify(resourceChange.identifiers)
      : "";
    return `${resourceChange.extension.name}::${resourceChange.type ?? "unknown"} ${identifiers}`.trim();
  }

  return (
    resourceChange.id ?? resourceChange.symbolicName ?? "(unknown resource)"
  );
}

function formatResourceChangesStats(
  builder: ColorStringBuilder,
  resourceChanges: DeploymentStacksWhatIfResourceChange[],
): void {
  builder.appendLine().append("Resource changes: ");

  if (!resourceChanges.length) {
    builder.append("no change.");
    return;
  }

  const sortedResourceChanges = resourceChanges
    .slice()
    .sort(
      (a, b) =>
        changeTypeToWeight[a.changeType as StackChangeType] -
        changeTypeToWeight[b.changeType as StackChangeType],
    );

  const grouped = groupBy(
    sortedResourceChanges,
    x => x.changeType as StackChangeType,
  );

  const countByChangeType = entries(grouped)
    .map(([key, value]) => ({ key, count: value.length }))
    .filter(x => x.count > 0);

  const changeTypeStats = countByChangeType.map(x =>
    formatChangeTypeCount(x.key, x.count),
  );

  builder.append(changeTypeStats.join(", ")).append(".");
}

function formatChangeTypeCount(
  changeType: StackChangeType,
  count: number,
): string {
  switch (changeType) {
    case "create":
      return `${count} to create`;
    case "delete":
      return `${count} to delete`;
    case "detach":
      return `${count} to detach`;
    case "modify":
      return `${count} to modify`;
    case "noChange":
      return `${count} no change`;
    case "unsupported":
      return `${count} unsupported`;
    default:
      throw new Error(errorMessages.invalidChangeType(changeType));
  }
}

function toWhatIfPropertyChange(
  propertyChange: DeploymentStacksWhatIfPropertyChange,
): WhatIfPropertyChange {
  const changeType = propertyChange.changeType;
  const propertyChangeType = (changeType.charAt(0).toUpperCase() +
    changeType.slice(1)) as PropertyChangeType;

  return {
    path: propertyChange.path,
    propertyChangeType,
    before: propertyChange.before,
    after: propertyChange.after,
    children: propertyChange.children?.map(toWhatIfPropertyChange),
  };
}
