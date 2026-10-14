// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { SemanticVersion, VersionRange } from "../src/utils/versionRange";

describe("SemanticVersion", () => {
  it.each([
    ["1.2.3", 1, 2, 3],
    ["1.2", 1, 2, 0],
    ["1", 1, 0, 0],
    ["0.31.92", 0, 31, 92],
  ])("parses %s", (value, major, minor, patch) => {
    const version = SemanticVersion.parse(value);
    expect(version.major).toBe(major);
    expect(version.minor).toBe(minor);
    expect(version.patch).toBe(patch);
  });

  it.each(["", "a.b.c", "1.2.3.4", "-1.0.0", "1.02.0"])("rejects %s", value => {
    expect(SemanticVersion.tryParse(value)).toBeUndefined();
  });

  it("compares versions by major, then minor, then patch", () => {
    expect(
      SemanticVersion.parse("1.0.0").compareTo(SemanticVersion.parse("2.0.0")),
    ).toBeLessThan(0);
    expect(
      SemanticVersion.parse("1.2.0").compareTo(SemanticVersion.parse("1.1.0")),
    ).toBeGreaterThan(0);
    expect(
      SemanticVersion.parse("1.2.3").compareTo(SemanticVersion.parse("1.2.3")),
    ).toBe(0);
  });

  it("round-trips via toString", () => {
    expect(SemanticVersion.parse("1.2").toString()).toBe("1.2.0");
  });
});

describe("VersionRange", () => {
  it("parses an exact version as an inclusive range of one version", () => {
    const range = VersionRange.parse("0.31.92");
    expect(range.isExactVersion).toBe(true);
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.31.92"))).toBe(true);
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.31.93"))).toBe(false);
  });

  it("parses a lower-and-upper-bound range", () => {
    const range = VersionRange.parse(">=0.31.0, <1.0.0");
    expect(range.isExactVersion).toBe(false);
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.31.0"))).toBe(true);
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.99.0"))).toBe(true);
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.30.9"))).toBe(false);
    expect(range.isSatisfiedBy(SemanticVersion.parse("1.0.0"))).toBe(false);
  });

  it("parses a single lower-bound-only range", () => {
    const range = VersionRange.parse(">0.31.0");
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.31.1"))).toBe(true);
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.31.0"))).toBe(false);
  });

  it("ignores comparator order", () => {
    const range = VersionRange.parse("<1.0.0, >=0.31.0");
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.50.0"))).toBe(true);
  });

  it("ignores whitespace around comparators", () => {
    const range = VersionRange.parse("  >= 0.31.0 ,  < 1.0.0  ");
    expect(range.isSatisfiedBy(SemanticVersion.parse("0.50.0"))).toBe(true);
  });

  it.each([
    "not-a-version",
    ">=1.0.0, >=2.0.0", // two lower bounds
    "<1.0.0, <2.0.0", // two upper bounds
    "=1.0.0, <2.0.0", // exact version combined with a bound
    ">=1.0.0, <2.0.0, <3.0.0", // more than two comparators
  ])("rejects invalid constraint %s", value => {
    expect(VersionRange.tryParse(value)).toBeUndefined();
  });

  it("flags an inverted range as unsatisfiable", () => {
    const range = VersionRange.parse(">=2.0.0, <1.0.0");
    expect(range.isSatisfiable).toBe(false);
  });

  it("flags adjacent exclusive bounds as unsatisfiable", () => {
    const range = VersionRange.parse(">1.2.3, <1.2.4");
    expect(range.isSatisfiable).toBe(false);
  });

  it("treats non-adjacent exclusive bounds as satisfiable", () => {
    const range = VersionRange.parse(">1.2.3, <1.2.5");
    expect(range.isSatisfiable).toBe(true);
    expect(range.isSatisfiedBy(SemanticVersion.parse("1.2.4"))).toBe(true);
  });

  it("treats coincident inclusive bounds as satisfiable", () => {
    const range = VersionRange.parse(">=1.2.3, <=1.2.3");
    expect(range.isSatisfiable).toBe(true);
  });

  it("treats coincident exclusive bounds as unsatisfiable", () => {
    const range = VersionRange.parse(">1.2.3, <=1.2.3");
    expect(range.isSatisfiable).toBe(false);
  });

  it("renders an exact version without operators via toString", () => {
    expect(VersionRange.parse("0.31.92").toString()).toBe("0.31.92");
  });

  it("renders a range via toString", () => {
    expect(VersionRange.parse(">=0.31.0,<1.0.0").toString()).toBe(
      ">=0.31.0, <1.0.0",
    );
  });
});
