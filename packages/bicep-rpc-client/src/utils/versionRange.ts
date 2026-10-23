// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Uses the same version parsing logic as Bicep.Core (SemanticVersion / VersionComparator /
// VersionRange), so "bicep.version" constraints are evaluated the same way here as in the compiler.

/** A version made up of a major, minor and patch number, as published for Bicep releases. */
export class SemanticVersion {
  private constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
  ) {}

  // Omitted components default to zero: "1.2" is equivalent to "1.2.0", and "1" to "1.0.0".
  private static readonly pattern =
    /^(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*))?)?$/;

  static tryParse(value: string): SemanticVersion | undefined {
    const match = SemanticVersion.pattern.exec(value);
    if (!match) {
      return undefined;
    }

    const major = Number(match[1]);
    const minor = match[2] !== undefined ? Number(match[2]) : 0;
    const patch = match[3] !== undefined ? Number(match[3]) : 0;

    return new SemanticVersion(major, minor, patch);
  }

  static parse(value: string): SemanticVersion {
    const result = SemanticVersion.tryParse(value);
    if (!result) {
      throw new Error(`The provided value '${value}' is not a valid version.`);
    }
    return result;
  }

  /**
   * Orders two versions by major, then minor, then patch. Returns a negative number when this
   * version is lower than the other, zero when they are equal, and a positive number when it is
   * higher.
   */
  compareTo(other: SemanticVersion): number {
    if (this.major !== other.major) {
      return this.major - other.major;
    }
    if (this.minor !== other.minor) {
      return this.minor - other.minor;
    }
    return this.patch - other.patch;
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}

export type VersionComparatorOperator = "=" | ">" | ">=" | "<" | "<=";

// Check ">=" and "<=" before ">" and "<", so we don't mistake ">=" for ">" plus a version starting with "=".
const operatorTokens: VersionComparatorOperator[] = [">=", "<=", ">", "<", "="];

/** A single component of a version constraint. A bare version such as "1.2.0" is equivalent to "=1.2.0". */
export class VersionComparator {
  constructor(
    public readonly operator: VersionComparatorOperator,
    public readonly version: SemanticVersion,
  ) {}

  /** Whether this comparator constrains how low a version may go. */
  get isLowerBound(): boolean {
    return this.operator === ">" || this.operator === ">=";
  }

  /** Whether this comparator constrains how high a version may go. */
  get isUpperBound(): boolean {
    return this.operator === "<" || this.operator === "<=";
  }

  /** Whether the bound itself is an accepted version. */
  get isInclusive(): boolean {
    return this.operator !== ">" && this.operator !== "<";
  }

  isSatisfiedBy(version: SemanticVersion): boolean {
    const comparison = version.compareTo(this.version);
    switch (this.operator) {
      case "=":
        return comparison === 0;
      case ">":
        return comparison > 0;
      case ">=":
        return comparison >= 0;
      case "<":
        return comparison < 0;
      case "<=":
        return comparison <= 0;
    }
  }

  static tryParse(value: string): VersionComparator | undefined {
    let remainder = value.trim();
    let operator: VersionComparatorOperator = "=";

    for (const token of operatorTokens) {
      if (remainder.startsWith(token)) {
        operator = token;
        remainder = remainder.slice(token.length).trimStart();
        break;
      }
    }

    const version = SemanticVersion.tryParse(remainder);
    if (!version) {
      return undefined;
    }

    return new VersionComparator(operator, version);
  }

  toString(): string {
    switch (this.operator) {
      // An exact constraint is rendered without an operator, matching the syntax users write.
      case "=":
        return this.version.toString();
      default:
        return `${this.operator}${this.version}`;
    }
  }
}

/**
 * A version constraint, expressed either as an exact version ("1.2.3") or as a range pairing a
 * lower bound with an upper bound. Whitespace around comparators is ignored.
 */
export class VersionRange {
  // A range may pair at most one lower bound with one upper bound.
  private static readonly maxComparatorCount = 2;
  private static readonly comparatorSeparator = ",";

  private constructor(
    public readonly lowerBound?: VersionComparator,
    public readonly upperBound?: VersionComparator,
  ) {}

  /** Whether this constraint accepts a single version only. An exact version is held as a pair of inclusive bounds. */
  get isExactVersion(): boolean {
    return (
      !!this.lowerBound?.isInclusive &&
      !!this.upperBound?.isInclusive &&
      this.lowerBound.version.compareTo(this.upperBound.version) === 0
    );
  }

  /**
   * Whether a version could actually fall between the bounds, e.g. ">=2.0.0, <1.0.0" is inverted,
   * and ">1.2.3, <1.2.4" excludes the only version (1.2.3/1.2.4 themselves) that could satisfy it.
   */
  get isSatisfiable(): boolean {
    if (!this.lowerBound || !this.upperBound) {
      return true;
    }

    const comparison = this.lowerBound.version.compareTo(
      this.upperBound.version,
    );
    if (comparison < 0) {
      return !VersionRange.areAdjacentExclusiveBounds(
        this.lowerBound,
        this.upperBound,
      );
    }
    if (comparison === 0) {
      // The bounds coincide, so the range describes a single version only if both ends include it.
      return this.lowerBound.isInclusive && this.upperBound.isInclusive;
    }
    return false;
  }

  /**
   * Whether the lower and upper bounds are both exclusive and exactly one patch version apart,
   * e.g. ">1.2.3, <1.2.4". No version can satisfy such a pair, since patch numbers are whole
   * integers and there is nothing strictly between them.
   */
  private static areAdjacentExclusiveBounds(
    lower: VersionComparator,
    upper: VersionComparator,
  ): boolean {
    return (
      !lower.isInclusive &&
      !upper.isInclusive &&
      lower.version.major === upper.version.major &&
      lower.version.minor === upper.version.minor &&
      lower.version.patch + 1 === upper.version.patch
    );
  }

  isSatisfiedBy(version: SemanticVersion): boolean {
    return (
      (this.lowerBound?.isSatisfiedBy(version) ?? true) &&
      (this.upperBound?.isSatisfiedBy(version) ?? true)
    );
  }

  static tryParse(value: string): VersionRange | undefined {
    const parts = value.split(VersionRange.comparatorSeparator);
    if (parts.length > VersionRange.maxComparatorCount) {
      return undefined;
    }

    let lowerBound: VersionComparator | undefined;
    let upperBound: VersionComparator | undefined;

    // Assigning each comparator to the end of the range it constrains rejects redundant
    // constraints such as ">=1.0.0, >=2.0.0", and makes the order the parts were written in
    // irrelevant.
    for (const part of parts) {
      const comparator = VersionComparator.tryParse(part);
      if (!comparator) {
        return undefined;
      }

      if (comparator.operator === "=") {
        // An exact version is the degenerate range that admits only itself, so it occupies both
        // ends. This also rejects any constraint combining an exact version with a bound, such as
        // "=1.0.0, <2.0.0".
        if (lowerBound || upperBound) {
          return undefined;
        }
        lowerBound = new VersionComparator(">=", comparator.version);
        upperBound = new VersionComparator("<=", comparator.version);
      } else if (comparator.isLowerBound) {
        if (lowerBound) {
          return undefined;
        }
        lowerBound = comparator;
      } else {
        if (upperBound) {
          return undefined;
        }
        upperBound = comparator;
      }
    }

    return new VersionRange(lowerBound, upperBound);
  }

  static parse(value: string): VersionRange {
    const result = VersionRange.tryParse(value);
    if (!result) {
      throw new Error(
        `The provided value '${value}' is not a valid version constraint.`,
      );
    }
    return result;
  }

  /**
   * Renders the constraint in its normalized form. An exact version is shown the way a user would
   * write it rather than as a pair of bounds.
   */
  toString(): string {
    if (this.isExactVersion && this.lowerBound) {
      return this.lowerBound.version.toString();
    }
    return [this.lowerBound, this.upperBound]
      .filter((c): c is VersionComparator => !!c)
      .join(", ");
  }
}

/**
 * Picks the highest published release that satisfies `range`, out of a list of raw version
 * strings (as returned by `Bicep.listReleases()`). Unparsable entries are ignored rather than
 * treated as an error. Returns undefined if none of the versions satisfy the range.
 */
export function selectHighestSatisfyingVersion(
  range: VersionRange,
  availableVersions: string[],
): string | undefined {
  let best: SemanticVersion | undefined;

  for (const raw of availableVersions) {
    const parsed = SemanticVersion.tryParse(raw);
    if (!parsed || !range.isSatisfiedBy(parsed)) {
      continue;
    }
    if (!best || parsed.compareTo(best) > 0) {
      best = parsed;
    }
  }

  return best?.toString();
}
