// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  ChangeType,
  PropertyChangeType,
  WhatIfChange,
  WhatIfOperationResult,
  WhatIfPropertyChange,
} from "@azure/arm-resources";
import { Color } from "./logging";

// ChatGPT was heavily utilized to generate this file, using the below Python code as a starting point:
// https://github.com/Azure/azure-cli/blob/5b77a09013d0f15f01e2b2acce1efd37571ac1d9/src/azure-cli/azure/cli/command_modules/resource/_formatters.py#L84

type UnknownValue = unknown;

enum Symbol {
  WhiteSpace = " ",
  Quote = '"',
  Colon = ":",
  LeftSquareBracket = "[",
  RightSquareBracket = "]",
  Dot = ".",
  Equal = "=",
  Asterisk = "*",
  Plus = "+",
  Minus = "-",
  Tilde = "~",
  ExclamationPoint = "!",
  Cross = "x",
}

const changeTypeToColor: Record<ChangeType, Color> = {
  Create: Color.Green,
  Delete: Color.Yellow,
  Modify: Color.Magenta,
  Deploy: Color.Blue,
  NoChange: Color.Reset,
  Ignore: Color.White,
  Unsupported: Color.White,
};

const propertyChangeTypeToColor: Record<PropertyChangeType, Color> = {
  Create: Color.Green,
  Delete: Color.Yellow,
  Modify: Color.Magenta,
  Array: Color.Magenta,
  NoEffect: Color.White,
};

const changeTypeToSymbol: Record<ChangeType, Symbol> = {
  Create: Symbol.Plus,
  Delete: Symbol.Minus,
  Modify: Symbol.Tilde,
  Deploy: Symbol.ExclamationPoint,
  NoChange: Symbol.Equal,
  Ignore: Symbol.Asterisk,
  Unsupported: Symbol.Cross,
};

const propertyChangeTypeToSymbol: Record<PropertyChangeType, Symbol> = {
  Create: Symbol.Plus,
  Delete: Symbol.Minus,
  Modify: Symbol.Tilde,
  Array: Symbol.Tilde,
  NoEffect: Symbol.Cross,
};

const changeTypeToWeight: Record<ChangeType, number> = {
  Delete: 0,
  Create: 1,
  Deploy: 2,
  Modify: 3,
  NoChange: 4,
  Unsupported: 5,
  Ignore: 6,
};

const propertyChangeTypeToWeight: Record<PropertyChangeType, number> = {
  Delete: 0,
  Create: 1,
  Modify: 2,
  Array: 2,
  NoEffect: 3,
};

const propertyChangeToChangeType: Record<PropertyChangeType, ChangeType> = {
  Array: "Modify",
  Create: "Create",
  Delete: "Delete",
  Modify: "Modify",
  NoEffect: "NoChange",
};

class StringBuilder {
  private buffer: string = "";
  constructor(private enableColor: boolean) {}

  append(value: string, color?: Color): this {
    if (color) {
      this.withColorScope(color, () => {
        this.buffer += value;
      });
    } else {
      this.buffer += value;
    }
    return this;
  }

  appendLine(value: string = ""): this {
    this.append(value + "\n");
    return this;
  }

  withColorScope(color: Color, action: () => void): void {
    if (this.enableColor) {
      this.append(color);
    }
    action();
    if (this.enableColor) {
      this.append(Color.Reset);
    }
  }

  build(): string {
    return this.buffer;
  }
}

export function formatWhatIfOperationResult(
  whatIfOperationResult: WhatIfOperationResult,
  enableColor = true,
): string {
  const builder = new StringBuilder(enableColor);
  formatNoiseNotice(builder);
  formatChangeTypeLegend(builder, whatIfOperationResult.changes ?? []);
  formatResourceChanges(builder, whatIfOperationResult.changes ?? []);
  formatResourceChangesStats(builder, whatIfOperationResult.changes ?? []);
  return builder.build();
}

function formatNoiseNotice(builder: StringBuilder): void {
  builder.appendLine(`Note: The result may contain false positive predictions (noise).
You can help us improve the accuracy of the result by opening an issue here: https://aka.ms/WhatIfIssues`);
  builder.appendLine();
}

function formatChangeTypeLegend(
  builder: StringBuilder,
  resourceChanges: WhatIfChange[],
): void {
  if (!resourceChanges.length) return;

  const changeTypeSet = new Set<ChangeType>();

  function populateChangeTypeSet(
    propertyChanges: WhatIfPropertyChange[],
  ): void {
    if (!propertyChanges.length) return;

    for (const propertyChange of propertyChanges) {
      const propertyChangeType = propertyChange.propertyChangeType;
      changeTypeSet.add(propertyChangeToChangeType[propertyChangeType]);
      populateChangeTypeSet(propertyChange.children ?? []);
    }
  }

  for (const resourceChange of resourceChanges) {
    changeTypeSet.add(resourceChange.changeType);
    populateChangeTypeSet(resourceChange.delta ?? []);
  }

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

function formatResourceChangesStats(
  builder: StringBuilder,
  resourceChanges: WhatIfChange[],
): void {
  builder.appendLine().append("Resource changes: ");

  if (!resourceChanges.length) {
    builder.append("no change.");
    return;
  }

  const sortedResourceChanges = resourceChanges.sort(
    (a, b) =>
      changeTypeToWeight[a.changeType] - changeTypeToWeight[b.changeType],
  );
  const resourceChangesByChangeType = groupBy(
    sortedResourceChanges,
    x => x.changeType,
  );
  const countByChangeType = entries(resourceChangesByChangeType)
    .map(([key, value]) => ({ key, count: value.length }))
    .filter(x => x.count > 0);
  const changeTypeStats = countByChangeType.map(x =>
    formatChangeTypeCount(x.key, x.count),
  );

  builder.append(changeTypeStats.join(", ")).append(".");
}

function formatChangeTypeCount(changeType: ChangeType, count: number): string {
  switch (changeType) {
    case "Create":
      return `${count} to create`;
    case "Delete":
      return `${count} to delete`;
    case "Deploy":
      return `${count} to deploy`;
    case "Modify":
      return `${count} to modify`;
    case "Ignore":
      return `${count} to ignore`;
    case "NoChange":
      return `${count} no change`;
    case "Unsupported":
      return `${count} unsupported`;
    default:
      throw new Error(`Invalid ChangeType: ${changeType}`);
  }
}

function formatResourceChanges(
  builder: StringBuilder,
  resourceChanges: WhatIfChange[],
): void {
  if (!resourceChanges.length) return;

  const numScopes = new Set(resourceChanges.map(getScopeUppercase)).size;
  const resourceChangesByScope = groupBy(
    resourceChanges.sort((a, b) =>
      getScopeUppercase(a).localeCompare(getScopeUppercase(b)),
    ),
    getScopeUppercase,
  );

  builder.appendLine();
  builder.appendLine(
    `The deployment will update the following ${numScopes === 1 ? "scope:" : "scopes:"}`,
  );

  for (const [scope, resourceChangesInScope] of entries(
    resourceChangesByScope,
  )) {
    formatResourceChangesInScope(builder, scope, resourceChangesInScope);
  }
}

function formatResourceChangesInScope(
  builder: StringBuilder,
  scope: string,
  resourceChangesInScope: WhatIfChange[],
): void {
  builder.appendLine().appendLine(`Scope: ${scope}`);

  const sortedResourceChanges = resourceChangesInScope.sort(
    (a, b) =>
      changeTypeToWeight[a.changeType] - changeTypeToWeight[b.changeType],
  );

  const grouped = groupBy(sortedResourceChanges, x => x.changeType);
  for (const [changeType, resourceChanges] of entries(grouped)) {
    builder.withColorScope(changeTypeToColor[changeType], () => {
      for (const resourceChange of resourceChanges) {
        const isLast =
          resourceChange ===
          sortedResourceChanges[sortedResourceChanges.length - 1];
        formatResourceChange(builder, resourceChange, isLast);
      }
    });
  }
}

function formatResourceChange(
  builder: StringBuilder,
  resourceChange: WhatIfChange,
  isLast: boolean,
): void {
  const changeType = resourceChange.changeType;
  const relativeResourceId = getRelativeResourceId(resourceChange);
  const apiVersion = getApiVersion(resourceChange);

  builder.appendLine();
  formatResourceChangePath(builder, changeType, relativeResourceId, apiVersion);

  if (changeType === "Create" && resourceChange.after) {
    formatJsonValue(builder, resourceChange.after, "", 2);
  } else if (changeType === "Delete" && resourceChange.before) {
    formatJsonValue(builder, resourceChange.before, "", 2);
  } else if (resourceChange.delta) {
    const delta = resourceChange.delta;
    builder.withColorScope(Color.Reset, () => {
      builder.appendLine();
      formatPropertyChanges(
        builder,
        delta.sort(
          (a, b) =>
            propertyChangeTypeToWeight[a.propertyChangeType] -
            propertyChangeTypeToWeight[b.propertyChangeType],
        ),
      );
    });
  } else if (isLast) {
    builder.appendLine();
  }
}

function formatResourceChangePath(
  builder: StringBuilder,
  changeType: ChangeType,
  resourceChangeId: string,
  apiVersion?: string,
): void {
  formatPath(
    builder,
    resourceChangeId,
    0,
    1,
    builder => formatResourceChangeType(builder, changeType),
    builder => formatResourceChangeApiVersion(builder, apiVersion),
  );
}

function formatResourceChangeType(
  builder: StringBuilder,
  changeType: ChangeType,
): void {
  const changeSymbol = changeTypeToSymbol[changeType];
  builder.append(changeSymbol).append(Symbol.WhiteSpace);
}

function formatResourceChangeApiVersion(
  builder: StringBuilder,
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

function formatPropertyChanges(
  builder: StringBuilder,
  propertyChanges: WhatIfPropertyChange[],
  indentLevel: number = 2,
): void {
  const maxPathLength = getMaxPathLengthFromPropertyChanges(propertyChanges);

  for (const propertyChange of propertyChanges) {
    formatPropertyChange(builder, propertyChange, maxPathLength, indentLevel);
    builder.appendLine();
  }
}

function formatPropertyChange(
  builder: StringBuilder,
  propertyChange: WhatIfPropertyChange,
  maxPathLength: number,
  indentLevel: number,
): void {
  const propertyChangeType = propertyChange.propertyChangeType;
  const before = propertyChange.before;
  const after = propertyChange.after;
  const children = propertyChange.children || [];

  switch (propertyChangeType) {
    case "Create":
      formatPropertyChangePath(
        builder,
        propertyChange,
        propertyChange.after,
        maxPathLength,
        indentLevel,
      );
      formatPropertyCreate(builder, after, indentLevel + 1);
      break;
    case "Delete":
      formatPropertyChangePath(
        builder,
        propertyChange,
        propertyChange.before,
        maxPathLength,
        indentLevel,
      );
      formatPropertyDelete(builder, before, indentLevel + 1);
      break;
    case "Modify":
      formatPropertyChangePath(
        builder,
        propertyChange,
        propertyChange.before,
        maxPathLength,
        indentLevel,
      );
      formatPropertyModify(builder, before, after, children, indentLevel + 1);
      break;
    case "Array":
      formatPropertyChangePath(
        builder,
        propertyChange,
        propertyChange.children,
        maxPathLength,
        indentLevel,
      );
      formatPropertyArrayChange(
        builder,
        propertyChange,
        children,
        indentLevel + 1,
      );
      break;
    case "NoEffect":
      formatPropertyChangePath(
        builder,
        propertyChange,
        propertyChange.after,
        maxPathLength,
        indentLevel,
      );
      formatPropertyNoEffect(builder, after, indentLevel + 1);
      break;
    default:
      throw new Error(`Unknown property change type: ${propertyChangeType}.`);
  }
}

function formatPropertyChangePath(
  builder: StringBuilder,
  propertyChange: WhatIfPropertyChange,
  value: UnknownValue,
  maxPathLength: number,
  indentLevel: number,
): void {
  if (!propertyChange.path) return;

  const path = propertyChange.path;
  const propertyChangeType = propertyChange.propertyChangeType;

  let paddingWidth = maxPathLength - path.length + 1;

  if (isNonEmptyArray(value)) {
    paddingWidth = 1;
  } else if (isNonEmptyObject(value)) {
    paddingWidth = 0;
  } else if (propertyChangeType === "Modify" && propertyChange.children) {
    paddingWidth = 0; // Has nested changes.
  }

  formatPath(
    builder,
    path,
    paddingWidth,
    indentLevel,
    builder => formatPropertyChangeType(builder, propertyChangeType),
    formatColon,
  );
}

function formatPropertyChangeType(
  builder: StringBuilder,
  propertyChangeType: PropertyChangeType,
): void {
  const propertyChangeSymbol = propertyChangeTypeToSymbol[propertyChangeType];
  const propertyChangeColor = propertyChangeTypeToColor[propertyChangeType];
  builder
    .append(propertyChangeSymbol, propertyChangeColor)
    .append(Symbol.WhiteSpace);
}

function formatPropertyNoEffect(
  builder: StringBuilder,
  value: UnknownValue,
  indentLevel: number,
): void {
  builder.withColorScope(propertyChangeTypeToColor["NoEffect"], () => {
    formatJsonValue(builder, value, undefined, undefined, indentLevel);
  });
}

function formatPropertyCreate(
  builder: StringBuilder,
  value: UnknownValue,
  indentLevel: number,
): void {
  builder.withColorScope(propertyChangeTypeToColor["Create"], () => {
    formatJsonValue(builder, value, undefined, undefined, indentLevel);
  });
}

function formatPropertyDelete(
  builder: StringBuilder,
  value: UnknownValue,
  indentLevel: number,
): void {
  builder.withColorScope(propertyChangeTypeToColor["Delete"], () => {
    formatJsonValue(builder, value, undefined, undefined, indentLevel);
  });
}

function formatPropertyModify(
  builder: StringBuilder,
  before: UnknownValue,
  after: UnknownValue,
  children: WhatIfPropertyChange[],
  indentLevel: number,
): void {
  if (children) {
    // Has nested changes.
    builder.appendLine().appendLine();
    formatPropertyChanges(
      builder,
      // TODO is this implemented correctly?
      sortBy(children, x => propertyChangeTypeToWeight[x.propertyChangeType]),
      indentLevel,
    );
  } else {
    formatPropertyDelete(builder, before, indentLevel);

    // Space before =>
    if (isNonEmptyObject(before)) {
      builder.appendLine();
      formatIndent(builder, indentLevel);
    } else {
      builder.append(Symbol.WhiteSpace);
    }

    builder.append("=>");

    // Space after =>
    if (!isNonEmptyObject(after)) {
      builder.append(Symbol.WhiteSpace);
    }

    formatPropertyCreate(builder, after, indentLevel);

    if (!isLeaf(before) && isLeaf(after)) {
      builder.appendLine();
    }
  }
}

function formatPropertyArrayChange(
  builder: StringBuilder,
  parentPropertyChange: WhatIfPropertyChange,
  propertyChanges: WhatIfPropertyChange[],
  indentLevel: number,
): void {
  if (!parentPropertyChange.path) {
    // The parent change doesn't have a path, which means the current
    // array change is a nested change. Decrease indent level.
    indentLevel -= 1;
    formatIndent(builder, indentLevel);
  }

  if (!propertyChanges || propertyChanges.length === 0) {
    builder.appendLine("[]");
    return;
  }

  // [
  builder.append(Symbol.LeftSquareBracket).appendLine();

  formatPropertyChanges(
    builder,
    // TODO is this implemented correctly?
    sortBy(
      propertyChanges,
      x => propertyChangeTypeToWeight[x.propertyChangeType],
    ),
    indentLevel,
  );

  // ]
  formatIndent(builder, indentLevel);
  builder.append(Symbol.RightSquareBracket);
}

function getApiVersion(resourceChange: WhatIfChange): string | undefined {
  if (resourceChange.before) {
    return resourceChange.before.apiVersion as string;
  }
  if (resourceChange.after) {
    return resourceChange.after.apiVersion as string;
  }
}

function getScope(resourceChange: WhatIfChange): string {
  const [scope] = splitResourceId(resourceChange.resourceId);
  return scope;
}

function getScopeUppercase(resourceChange: WhatIfChange): string {
  return getScope(resourceChange).toUpperCase();
}

function getRelativeResourceId(resourceChange: WhatIfChange): string {
  const [, relativeResourceId] = splitResourceId(resourceChange.resourceId);
  return relativeResourceId;
}

function getMaxPathLengthFromPropertyChanges(
  propertyChanges: WhatIfPropertyChange[],
): number {
  if (!propertyChanges || propertyChanges.length === 0) {
    return 0;
  }

  const filteredPropertyChanges = propertyChanges.filter(
    shouldConsiderPropertyChangePath,
  );
  const pathLengths = filteredPropertyChanges.map(x => x.path.length);

  return Math.max(...pathLengths, 0);
}

function shouldConsiderPropertyChangePath(
  propertyChange: WhatIfPropertyChange,
): boolean {
  const propertyChangeType = propertyChange.propertyChangeType;

  if (propertyChangeType === "Create") {
    return isLeaf(propertyChange.after);
  }

  if (propertyChangeType === "Delete" || propertyChangeType === "Modify") {
    return isLeaf(propertyChange.before);
  }

  return !propertyChange.children;
}

function formatJsonValue(
  builder: StringBuilder,
  value: UnknownValue,
  path: string = "",
  maxPathLength: number = 0,
  indentLevel: number = 0,
): void {
  if (isLeaf(value)) {
    formatJsonPath(builder, path, maxPathLength - path.length + 1, indentLevel);
    formatLeaf(builder, value);
  } else if (isNonEmptyArray(value)) {
    formatJsonPath(builder, path, 1, indentLevel);
    formatNonEmptyArray(builder, value, indentLevel);
  } else if (isNonEmptyObject(value)) {
    formatNonEmptyObject(builder, value, path, maxPathLength, indentLevel);
  } else {
    throw new Error(`Invalid JSON value: ${value}`);
  }
}

function formatLeaf(builder: StringBuilder, value: UnknownValue): void {
  if (value === null) {
    builder.append("null");
  } else if (typeof value === "boolean") {
    builder.append(String(value).toLowerCase());
  } else if (typeof value === "string") {
    builder.append(Symbol.Quote).append(value).append(Symbol.Quote);
  } else {
    builder.append(String(value));
  }
}

function formatNonEmptyArray(
  builder: StringBuilder,
  value: UnknownValue[],
  indentLevel: number,
): void {
  builder.append(Symbol.LeftSquareBracket, Color.Reset).appendLine();

  const maxPathLength = getMaxPathLengthFromArray(value);

  value.forEach((childValue, index) => {
    const childPath = String(index);

    if (isNonEmptyObject(childValue)) {
      formatJsonPath(builder, childPath, 0, indentLevel + 1);
      formatNonEmptyObject(
        builder,
        childValue,
        undefined,
        undefined,
        indentLevel + 1,
      );
    } else {
      formatJsonValue(
        builder,
        childValue,
        childPath,
        maxPathLength,
        indentLevel + 1,
      );
    }

    builder.appendLine();
  });

  formatIndent(builder, indentLevel);
  builder.append(Symbol.RightSquareBracket, Color.Reset);
}

function formatNonEmptyObject(
  builder: StringBuilder,
  value: Record<string, UnknownValue>,
  path: string = "",
  maxPathLength: number = 0,
  indentLevel: number = 0,
): void {
  const isRoot = !path;

  if (!path) {
    // Root object.
    builder.appendLine().appendLine();
    maxPathLength = getMaxPathLengthFromObject(value);
    indentLevel += 1;
  }

  for (const [childPath, childValue] of entries(value)) {
    const formattedChildPath = isRoot
      ? childPath
      : `${path}${Symbol.Dot}${childPath}`;
    formatJsonValue(
      builder,
      childValue,
      formattedChildPath,
      maxPathLength,
      indentLevel,
    );

    if (!isNonEmptyObject(childValue)) {
      builder.appendLine();
    }
  }
}

function formatJsonPath(
  builder: StringBuilder,
  path: string,
  paddingWidth: number,
  indentLevel: number,
): void {
  formatPath(builder, path, paddingWidth, indentLevel, undefined, formatColon);
}

function formatPath(
  builder: StringBuilder,
  path: string,
  paddingWidth: number,
  indentLevel: number,
  formatHead?: (builder: StringBuilder) => void,
  formatTail?: (builder: StringBuilder) => void,
): void {
  if (!path) return;

  formatIndent(builder, indentLevel);

  if (formatHead) {
    formatHead(builder);
  }

  builder.append(path);

  if (formatTail) {
    formatTail(builder);
  }

  builder.append(" ".repeat(paddingWidth));
}

function formatColon(builder: StringBuilder): void {
  builder.append(Symbol.Colon, Color.Reset);
}

function formatIndent(builder: StringBuilder, indentLevel: number = 1): void {
  builder.append(" ".repeat(2 * indentLevel));
}

function getMaxPathLengthFromArray(value: UnknownValue[]): number {
  let maxLengthIndex = 0;

  value.forEach((childValue, index) => {
    if (isLeaf(childValue)) {
      maxLengthIndex = index;
    }
  });

  return String(maxLengthIndex).length;
}

function getMaxPathLengthFromObject(
  value: Record<string, UnknownValue>,
): number {
  let maxPathLength = 0;

  for (const [key, childValue] of entries(value)) {
    if (isNonEmptyArray(childValue)) {
      continue; // Ignore array paths
    }

    const currentPathLength = isNonEmptyObject(childValue)
      ? key.length + 1 + getMaxPathLengthFromObject(childValue)
      : key.length;

    maxPathLength = Math.max(maxPathLength, currentPathLength);
  }

  return maxPathLength;
}

function isLeaf(value: UnknownValue): boolean {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && value && Object.keys(value).length === 0)
  );
}

function isNonEmptyArray(value: UnknownValue): value is UnknownValue[] {
  return Array.isArray(value) && value.length > 0;
}

function isNonEmptyObject(
  value: UnknownValue,
): value is Record<string, UnknownValue> {
  return (
    typeof value === "object" && value !== null && Object.keys(value).length > 0
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupBy<K extends keyof any, T>(
  array: T[],
  getKey: (item: T) => K,
): Record<K, T[]> {
  return array.reduce(
    (result, item) => {
      const key = getKey(item);
      (result[key] = result[key] || []).push(item);
      return result;
    },
    {} as Record<K, T[]>,
  );
}

function sortBy<T>(array: T[], getWeight: (item: T) => number): T[] {
  return array.slice().sort((a, b) => getWeight(a) - getWeight(b));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function entries<K extends keyof any, T>(record: Record<K, T>): [K, T][] {
  return entries(record) as [K, T][];
}

function splitResourceId(resourceId: string): [string, string] {
  const providers = "/providers/";
  const providersIndex = resourceId.lastIndexOf(providers);
  if (providersIndex === -1) {
    const rgMatches = resourceId.matchAll(
      /^(\/subscriptions\/[^/]+)\/(resourceGroups\/[^/]+)$/i,
    );
    if (rgMatches) {
      const matchesArray = [...rgMatches];
      return [matchesArray[1][0], matchesArray[2][0]];
    }

    return ["/", resourceId.substring(1)];
  }

  return [
    resourceId.substring(0, providersIndex),
    resourceId.substring(providersIndex + providers.length),
  ];
}
