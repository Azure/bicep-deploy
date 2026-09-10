// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import type {
  DeploymentStacksChangeDeltaRecord,
  DeploymentStacksDiagnostic,
  DeploymentStacksWhatIfChange,
  DeploymentStacksWhatIfPropertyChange,
  DeploymentStacksWhatIfResourceChange,
  DeploymentStacksWhatIfResult,
} from "@azure/arm-resourcesdeploymentstacks";
import { Color, ColorMode, ColorStringBuilder } from "./logging";
import { entries } from "./whatif";

type UnknownValue = unknown;

type StackWhatIfInput =
  | DeploymentStacksWhatIfResult
  | DeploymentStacksWhatIfChange;

type ChangeTypeInfo = {
  symbol: string;
  color?: Color;
};

type StackChangeLike = {
  after?: UnknownValue;
  before?: UnknownValue;
  changeType?: string | null;
  children?: DeploymentStacksWhatIfPropertyChange[];
  delta?: DeploymentStacksWhatIfPropertyChange[];
  path?: string;
};

type StackWhatIfResultProperties = {
  changes?: DeploymentStacksWhatIfChange;
  deploymentStackResourceId?: string;
  diagnostics?: DeploymentStacksDiagnostic[];
};

type ExtensionConfigValue = {
  keyVaultReference?: {
    secretName?: string;
    secretVersion?: string;
    keyVault?: {
      id?: string;
    };
  };
  value?: UnknownValue;
};

const allWhatIfTopLevelChangeTypes = [
  "create",
  "unsupported",
  "modify",
  "delete",
  "noChange",
  "detach",
] as const;

const changeTypeFormatting: Record<string, ChangeTypeInfo> = {
  array: { symbol: "~", color: Color.Magenta },
  create: { symbol: "+", color: Color.Green },
  delete: { symbol: "-", color: Color.Red },
  detach: { symbol: "v", color: Color.Blue },
  modify: { symbol: "~", color: Color.Magenta },
  nochange: { symbol: "=" },
  noeffect: { symbol: "=" },
  unsupported: { symbol: "!" },
};

const changeCertaintyPriorities: Record<string, number> = {
  definite: 0,
  potential: 1,
};

const diagnosticLevelPriorities: Record<string, number> = {
  info: 1,
  warning: 2,
  error: 3,
};

const diagnosticColors: Record<string, Color> = {
  warning: Color.DarkYellow,
  error: Color.Red,
};

const potentialChangesMessage =
  "Potential Resource Changes (Learn more at https://aka.ms/whatIfPotentialChanges)";
const potentialDeletionsMessage =
  "Potential Deletions %d total (Learn more at https://aka.ms/whatIfPotentialChanges)";

export function formatDeploymentStacksWhatIfChange(
  whatIfInput: StackWhatIfInput,
  colorMode: ColorMode,
): string {
  return new DeploymentStacksWhatIfResultFormatter(colorMode).format(
    whatIfInput,
  );
}

class DeploymentStacksWhatIfResultFormatter {
  private builder: ColorStringBuilder;
  private readonly colorMode: ColorMode;
  private whatIfProps?: StackWhatIfResultProperties;
  private whatIfChanges?: DeploymentStacksWhatIfChange;

  constructor(colorMode: ColorMode) {
    this.colorMode = colorMode;
    this.builder = new ColorStringBuilder(colorMode);
  }

  format(whatIfInput: StackWhatIfInput): string {
    this.builder.clear();

    this.whatIfProps = getWhatIfProperties(whatIfInput);
    this.whatIfChanges = this.whatIfProps?.changes;

    if (this.formatChangeTypeLegend()) {
      this.formatSectionSpacer();
    }
    if (this.formatStackChanges()) {
      this.formatSectionSpacer();
    }
    if (this.formatResourceChangesAndDeletionSummary()) {
      this.formatSectionSpacer();
    }
    this.formatDiagnostics();

    const result = this.builder.build();
    this.whatIfProps = undefined;
    this.whatIfChanges = undefined;

    return result;
  }

  private formatSectionSpacer(): void {
    this.builder.ensureNumNewLines(2);
  }

  private formatChangeTypeLegend(): boolean {
    const changeTypeMaxLength = 20;

    this.builder.appendLine(
      "Resource and property changes are indicated with these symbols:",
    );
    this.pushIndent();

    allWhatIfTopLevelChangeTypes.forEach((changeType, index) => {
      const { symbol, color } = getChangeTypeFormatting(changeType);
      const changeTypeLabel =
        changeType.charAt(0).toUpperCase() + changeType.slice(1);

      this.builder.append(symbol, color).append(" ").append(changeTypeLabel);

      if (index % 2 === 0) {
        const remainingIndent = Math.max(
          1,
          changeTypeMaxLength - changeTypeLabel.length,
        );
        this.builder.append(" ".repeat(remainingIndent));
      } else if (index < allWhatIfTopLevelChangeTypes.length - 1) {
        this.builder.appendLine();
      }
    });

    this.popIndent();
    return true;
  }

  private formatStackChanges(): boolean {
    if (!this.whatIfChanges) {
      return false;
    }

    const outerBuilder = this.builder;
    const sectionBuilder = new ColorStringBuilder(this.colorMode);
    this.builder = sectionBuilder;

    let printed = false;
    const allStackChanges: Record<string, StackChangeLike | undefined> = {
      DeploymentScope: this.whatIfChanges.deploymentScopeChange,
      DenySettings: this.whatIfChanges.denySettingsChange,
    };

    for (const [path, change] of entries(allStackChanges)) {
      if (this.formatChange(change, path)) {
        printed = true;
      }
    }

    this.builder = outerBuilder;

    if (printed) {
      this.builder.appendLine(
        `Changes to Stack ${this.whatIfProps?.deploymentStackResourceId ?? ""}:`,
        Color.DarkYellow,
      );
      this.builder.append(sectionBuilder.build(), undefined, true);
    }

    return printed;
  }

  private formatResourceChangesAndDeletionSummary(): boolean {
    const resourceChanges = this.whatIfChanges?.resourceChanges;
    if (!resourceChanges || resourceChanges.length === 0) {
      return false;
    }

    const resourceChangesSorted = resourceChanges
      .slice()
      .sort(compareResourceChanges);
    let printed = false;

    if (this.formatResourceChanges(resourceChangesSorted)) {
      printed = true;
    }
    if (this.formatResourceDeletionsSummary(resourceChangesSorted)) {
      printed = true;
    }

    return printed;
  }

  private formatResourceChanges(
    resourceChangesSorted: DeploymentStacksWhatIfResourceChange[],
  ): boolean {
    if (resourceChangesSorted.length === 0) {
      return false;
    }

    let lastGroup: string | undefined;
    let hasPotentialChanges = false;

    this.builder.appendLine("Changes to Managed Resources:", Color.DarkYellow);

    for (const change of resourceChangesSorted) {
      const group = formatResourceClassHeader(change);

      if (group !== lastGroup) {
        lastGroup = group;
        hasPotentialChanges = false;
        this.formatSectionSpacer();
        this.builder.appendLine(group);
      }

      this.pushIndent();

      if (!hasPotentialChanges && isPotentialChange(change.changeCertainty)) {
        this.builder.appendLine("", undefined, true);
        this.builder
          .append(">> ")
          .appendLine(potentialChangesMessage, Color.Magenta);
        hasPotentialChanges = true;
      }

      this.formatResourceChange(change);
      this.popIndent();
    }

    return true;
  }

  private formatResourceChange(
    resourceChange: DeploymentStacksWhatIfResourceChange,
  ): boolean {
    this.formatResourceHeadingLine(resourceChange);

    this.pushIndent();
    const allResourceChanges: Record<string, StackChangeLike | undefined> = {
      "Management Status": resourceChange.managementStatusChange,
      "Deny Status": resourceChange.denyStatusChange,
    };

    for (const [path, change] of entries(allResourceChanges)) {
      this.formatChange(change, path);
    }

    this.formatResourcePropertyChanges(
      resourceChange.resourceConfigurationChanges,
    );
    this.popIndent();

    return true;
  }

  private formatResourceDeletionsSummary(
    resourceChangesSorted: DeploymentStacksWhatIfResourceChange[],
  ): boolean {
    const deleteChanges = resourceChangesSorted.filter(resourceChange =>
      strLowerEq(resourceChange.changeType, "delete"),
    );

    if (deleteChanges.length === 0) {
      return false;
    }

    this.formatSectionSpacer();
    this.builder.append("Deleting - ", Color.Red);
    this.builder.appendLine(
      `Resources Marked for Deletion ${deleteChanges.length} total:`,
    );

    let lastGroup: string | undefined;
    let hasPotentialDeletions = false;

    deleteChanges.forEach((deleteChange, index) => {
      const group = formatResourceClassHeader(deleteChange);

      if (group !== lastGroup) {
        this.formatSectionSpacer();
        this.builder.appendLine(group);
        lastGroup = group;
        hasPotentialDeletions = false;
      }

      this.pushIndent();

      if (
        !hasPotentialDeletions &&
        isPotentialChange(deleteChange.changeCertainty)
      ) {
        this.builder.appendLine("", undefined, true);
        this.builder
          .append(">> ")
          .appendLine(
            potentialDeletionsMessage.replace(
              "%d",
              String(getNumPotentialResourceChanges(deleteChanges, index)),
            ),
            Color.Red,
          );
        hasPotentialDeletions = true;
      }

      this.formatResourceHeadingLine(deleteChange);
      this.popIndent();
    });

    return true;
  }

  private formatResourceHeadingLine(
    resourceChange: DeploymentStacksWhatIfResourceChange,
  ): void {
    const { symbol, color } = getChangeTypeFormatting(
      resourceChange.changeType,
    );
    const potentialChange = isPotentialChange(resourceChange.changeCertainty);

    if (potentialChange) {
      this.builder.append("?", Color.Cyan);
    }

    this.builder.append(symbol, color).append(" ");

    if (potentialChange) {
      this.builder.append("[Potential] ", Color.Cyan);
    }

    const apiVersion = getResourceApiVersion(resourceChange);
    const apiVersionSuffix = apiVersion ? ` [${apiVersion}]` : "";
    const resourceId = resourceChange.id
      ? resourceChange.id
      : `${resourceChange.type ?? ""} ${formatExtResourceIdentifiers(resourceChange.identifiers)}`;

    this.builder.appendLine(`${resourceId}${apiVersionSuffix}`, color);
  }

  private formatResourcePropertyChanges(
    propertyChanges?: DeploymentStacksChangeDeltaRecord | null,
  ): boolean {
    if (!propertyChanges?.delta || propertyChanges.delta.length === 0) {
      return false;
    }

    let printed = false;

    for (const propertyChange of propertyChanges.delta) {
      if (this.formatChange(propertyChange)) {
        printed = true;
      }
    }

    return printed;
  }

  private formatDiagnostics(): boolean {
    const diagnostics = this.whatIfProps?.diagnostics;
    if (!diagnostics || diagnostics.length === 0) {
      return false;
    }

    const diagnosticsSorted = diagnostics.slice().sort((left, right) => {
      const priorityCompare =
        getDiagnosticLevelPriority(left.level) -
        getDiagnosticLevelPriority(right.level);
      if (priorityCompare !== 0) {
        return priorityCompare;
      }

      const codeCompare = (left.code ?? "").localeCompare(right.code ?? "");
      if (codeCompare !== 0) {
        return codeCompare;
      }

      return (left.message ?? "").localeCompare(right.message ?? "");
    });

    this.builder.appendLine(`Diagnostics (${diagnosticsSorted.length}):`);
    this.builder.appendLine();

    diagnosticsSorted.forEach(diagnostic => {
      this.formatDiagnostic(diagnostic);
      this.builder.appendLine();
    });

    return true;
  }

  private formatDiagnostic(diagnostic: DeploymentStacksDiagnostic): void {
    const diagnosticColor = diagnostic.level
      ? diagnosticColors[normalizeComparable(diagnostic.level)]
      : undefined;

    this.builder.appendLine(
      `${(diagnostic.level ?? "").toUpperCase()}: [${diagnostic.code}]`,
      diagnosticColor,
    );
    this.pushIndent();
    this.builder.appendLine(`Message: ${diagnostic.message}`, diagnosticColor);
    if (diagnostic.target) {
      this.builder.appendLine(`Target: ${diagnostic.target}`, diagnosticColor);
    }
    this.popIndent();
  }

  private formatChange(
    change?: StackChangeLike | null,
    parentPath?: string,
    isArrayItem: boolean = false,
  ): boolean {
    if (!change) {
      return false;
    }

    const valueType = getValueTypeFromChange(change);
    if (!valueType) {
      return false;
    }

    if (valueType === "primitive") {
      return this.formatPrimitiveChange(change, parentPath, isArrayItem);
    }
    if (valueType === "array") {
      return this.formatArrayChanges(
        change as DeploymentStacksWhatIfPropertyChange,
        parentPath,
        isArrayItem,
      );
    }
    return this.formatObjectChange(change, parentPath, isArrayItem);
  }

  private formatObjectChange(
    objectChange?: StackChangeLike | null,
    parentPath?: string,
    isArrayItem: boolean = false,
  ): boolean {
    if (!objectChange) {
      return false;
    }

    const children = getChildChanges(objectChange);
    if (!children || children.length === 0) {
      if (hasChangeType(objectChange)) {
        return this.formatInlineObjectChange(
          objectChange as DeploymentStacksWhatIfPropertyChange,
          parentPath,
          isArrayItem,
        );
      }

      return false;
    }

    let printed = false;
    for (const child of children) {
      if (this.formatChange(child, parentPath)) {
        printed = true;
      }
    }

    return printed;
  }

  private formatInlineObjectChange(
    change: DeploymentStacksWhatIfPropertyChange,
    parentPath?: string,
    isArrayItem: boolean = false,
  ): boolean {
    const inlineObject = change.after ?? change.before;
    if (inlineObject === null || inlineObject === undefined) {
      return false;
    }

    const { symbol, color } = getChangeTypeFormatting(change.changeType);

    if (!isArrayItem) {
      const propertyPath = getChangePath(change, parentPath);
      this.builder.append(symbol, color);
      this.builder.append(` ${propertyPath}: `);
    }

    this.pushIndent();
    JSON.stringify(inlineObject, null, 2)
      ?.split("\n")
      .forEach(jsonLine => {
        this.builder.appendLine(jsonLine, color);
      });
    this.popIndent();

    return true;
  }

  private formatArrayChanges(
    arrayChange: DeploymentStacksWhatIfPropertyChange,
    parentPath?: string,
    isArrayItem: boolean = false,
  ): boolean {
    const children = arrayChange.children;
    if (!children || children.length === 0) {
      return this.formatInlineObjectChange(
        arrayChange,
        parentPath,
        isArrayItem,
      );
    }

    if (!strLowerEq(arrayChange.changeType, "array")) {
      return false;
    }

    const propertyPath = getChangePath(arrayChange, parentPath);
    const { symbol, color } = getChangeTypeFormatting("modify");

    this.builder.append(symbol, color);
    this.builder.appendLine(` ${propertyPath}:`);
    this.pushIndent();

    const printArrayIndices = children.every(child => !!child.path);
    const sortedChildren = printArrayIndices
      ? children
          .slice()
          .sort((left, right) => Number(left.path) - Number(right.path))
      : children;

    sortedChildren.forEach((itemChange, index) => {
      if (printArrayIndices) {
        const childFormatting = getChangeTypeFormatting(itemChange.changeType);
        this.builder
          .append(childFormatting.symbol, childFormatting.color)
          .appendLine(` ${itemChange.path}:`);
        this.pushIndent();
      }

      if (
        this.formatChange(itemChange, undefined, true) &&
        index < children.length - 1
      ) {
        this.builder.ensureNumNewLines(1);
      }

      if (printArrayIndices) {
        this.popIndent();
      }
    });

    this.popIndent();
    return true;
  }

  private formatPrimitiveChange(
    primitiveChange: StackChangeLike,
    parentPath?: string,
    isArrayItem: boolean = false,
  ): boolean {
    const normalizedChangeType = hasChangeType(primitiveChange)
      ? normalizeComparable(primitiveChange.changeType)
      : primitiveChange.before === primitiveChange.after
        ? "noeffect"
        : "modify";
    const propertyPath = getChangePath(primitiveChange, parentPath);
    const { symbol, color } = getChangeTypeFormatting(normalizedChangeType);

    this.builder.append(symbol, color);
    this.builder.append(" ");

    if (!isArrayItem) {
      this.builder.append(`${propertyPath}: `);
    }

    if (normalizedChangeType === "modify") {
      this.builder.append(formatPrimitiveValue(primitiveChange.before), color);
      this.builder.append(" => ");
      this.builder.appendLine(
        formatPrimitiveValue(primitiveChange.after),
        color,
      );
    } else {
      const value =
        normalizedChangeType === "delete"
          ? primitiveChange.before
          : primitiveChange.after;
      this.builder.appendLine(formatPrimitiveValue(value), color);
    }

    return true;
  }

  private pushIndent(indentSize: number = 2): void {
    this.builder.pushIndent(" ".repeat(indentSize));
  }

  private popIndent(): void {
    this.builder.popIndent();
  }
}

function getWhatIfProperties(
  whatIfInput: StackWhatIfInput,
): StackWhatIfResultProperties {
  if ("properties" in whatIfInput) {
    return whatIfInput.properties ?? {};
  }

  return {
    changes: whatIfInput as DeploymentStacksWhatIfChange,
  };
}

function compareResourceChanges(
  left: DeploymentStacksWhatIfResourceChange,
  right: DeploymentStacksWhatIfResourceChange,
): number {
  return (
    compareNumbers(left.id ? 0 : 1, right.id ? 0 : 1) ||
    compareNumbers(
      left.id ? getChangeCertaintyPriority(left.changeCertainty) : 0,
      right.id ? getChangeCertaintyPriority(right.changeCertainty) : 0,
    ) ||
    compareStrings(left.id?.toLowerCase(), right.id?.toLowerCase()) ||
    compareStrings(left.extension?.name, right.extension?.name) ||
    compareStrings(left.extension?.version, right.extension?.version) ||
    compareStrings(left.extension?.configId, right.extension?.configId) ||
    compareNumbers(
      left.id ? 0 : getChangeCertaintyPriority(left.changeCertainty),
      right.id ? 0 : getChangeCertaintyPriority(right.changeCertainty),
    ) ||
    compareStrings(
      left.extension ? left.type : undefined,
      right.extension ? right.type : undefined,
    ) ||
    compareStrings(
      left.identifiers
        ? formatExtResourceIdentifiers(left.identifiers)
        : undefined,
      right.identifiers
        ? formatExtResourceIdentifiers(right.identifiers)
        : undefined,
    )
  );
}

function compareNumbers(left: number, right: number): number {
  return left - right;
}

function compareStrings(left?: string | null, right?: string | null): number {
  return (left ?? "").localeCompare(right ?? "");
}

function strLowerEq(left?: string | null, right?: string | null): boolean {
  return (
    !!left &&
    !!right &&
    normalizeComparable(left) === normalizeComparable(right)
  );
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/gu, "");
}

function isPotentialChange(changeCertainty?: string | null): boolean {
  return strLowerEq(changeCertainty, "potential");
}

function getChangeCertaintyPriority(changeCertainty?: string | null): number {
  if (!changeCertainty) {
    return 1;
  }

  return changeCertaintyPriorities[normalizeComparable(changeCertainty)] ?? 1;
}

function getDiagnosticLevelPriority(level?: string | null): number {
  if (!level) {
    return 0;
  }

  return diagnosticLevelPriorities[normalizeComparable(level)] ?? 0;
}

function getChangeTypeFormatting(changeType?: string | null): ChangeTypeInfo {
  return (
    changeTypeFormatting[normalizeComparable(changeType ?? "")] ?? {
      symbol: "",
    }
  );
}

function getChangePath(change: StackChangeLike, parentPath?: string): string {
  if ("path" in change && change.path) {
    return parentPath ? `${parentPath}.${change.path}` : change.path;
  }

  return parentPath ?? "";
}

function getValueTypeFromChange(
  change: StackChangeLike,
): "primitive" | "array" | "object" | undefined {
  if (hasChangeType(change)) {
    if (strLowerEq(change.changeType, "array")) {
      return "array";
    }

    if (Array.isArray(change.children) && change.children.length > 0) {
      return "object";
    }
  } else if ("delta" in change && Array.isArray(change.delta)) {
    return "object";
  }

  const before = change.before;
  const after = change.after;
  const value = after !== null && after !== undefined ? after : before;

  if (Array.isArray(value)) {
    return "array";
  }
  if (isPlainObject(value)) {
    return "object";
  }
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return "primitive";
  }

  return undefined;
}

function getChildChanges(
  change: StackChangeLike,
): DeploymentStacksWhatIfPropertyChange[] | undefined {
  if ("delta" in change) {
    return change.delta;
  }

  if ("children" in change) {
    return change.children;
  }

  return undefined;
}

function hasChangeType(
  change: StackChangeLike,
): change is DeploymentStacksWhatIfPropertyChange {
  return "changeType" in change && typeof change.changeType === "string";
}

function formatPrimitiveValue(value: UnknownValue): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }

  return String(value);
}

function getNumPotentialResourceChanges(
  resourceChanges: DeploymentStacksWhatIfResourceChange[],
  startIndex: number,
): number {
  let count = 0;

  for (let index = startIndex; index < resourceChanges.length; index++) {
    if (isPotentialChange(resourceChanges[index].changeCertainty)) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function formatResourceClassHeader(
  change: DeploymentStacksWhatIfResourceChange,
): string {
  if (change.id) {
    return "Azure";
  }

  if (!change.extension) {
    return "Unknown";
  }

  let result = `${change.extension.name}@${change.extension.version}`;
  const config = change.extension.config as
    | Record<string, ExtensionConfigValue | undefined>
    | undefined;

  if (config) {
    const configItems = entries(config).sort(
      ([leftKey, leftValue], [rightKey, rightValue]) => {
        const leftHasKeyVault = !!leftValue?.keyVaultReference;
        const rightHasKeyVault = !!rightValue?.keyVaultReference;

        return (
          compareNumbers(Number(leftHasKeyVault), Number(rightHasKeyVault)) ||
          leftKey.localeCompare(rightKey)
        );
      },
    );

    const configParts: string[] = [];

    for (const [prop, item] of configItems) {
      if (!item) {
        continue;
      }

      if (item.keyVaultReference) {
        const secretName = item.keyVaultReference.secretName;
        const secretVersion = item.keyVaultReference.secretVersion;
        const keyVaultId = item.keyVaultReference.keyVault?.id;
        const versionSuffix = secretVersion ? `@${secretVersion}` : "";

        configParts.push(
          `${prop}=<Secret '${secretName}'${versionSuffix} in key vault '${keyVaultId}'>`,
        );
      } else {
        configParts.push(`${prop}=${JSON.stringify(item.value ?? null)}`);
      }
    }

    if (configParts.length > 0) {
      result += ` ${configParts.join(", ")}`;
    }
  }

  return result;
}

function getResourceApiVersion(
  resource: DeploymentStacksWhatIfResourceChange,
): string | undefined {
  if (resource.apiVersion) {
    return resource.apiVersion;
  }

  const resourceConfigChanges = resource.resourceConfigurationChanges;
  const after = resourceConfigChanges?.after;
  if (isPlainObject(after) && typeof after.apiVersion === "string") {
    return after.apiVersion;
  }

  const before = resourceConfigChanges?.before;
  if (isPlainObject(before) && typeof before.apiVersion === "string") {
    return before.apiVersion;
  }

  return undefined;
}

function formatExtResourceIdentifiers(
  identifiers?: Record<string, UnknownValue> | null,
): string {
  if (!identifiers) {
    return "";
  }

  return entries(identifiers)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(", ");
}

function isPlainObject(
  value: UnknownValue,
): value is Record<string, UnknownValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
