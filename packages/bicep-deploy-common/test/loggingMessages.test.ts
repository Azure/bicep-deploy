// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { describe, it, expect, afterEach } from "vitest";
import {
  loggingMessages,
  setLoggingMessages,
  resetLoggingMessages,
} from "../src/loggingMessages";

describe("logging messages", () => {
  afterEach(() => {
    resetLoggingMessages();
  });

  it("returns default string messages", () => {
    expect(loggingMessages.diagnosticsReturned).toBe(
      "Diagnostics returned by the API",
    );
  });

  it("returns default function messages", () => {
    expect(
      loggingMessages.bicepVersionInstalled("1.2.3", "/path/to/bicep"),
    ).toBe("Installed Bicep version 1.2.3 to /path/to/bicep");
    expect(loggingMessages.requestFailedCorrelation("test-id")).toBe(
      "Request failed. CorrelationId: test-id",
    );
    expect(loggingMessages.requestFailedCorrelation(null)).toBe(
      "Request failed. CorrelationId: null",
    );
  });

  it("overrides string messages", () => {
    setLoggingMessages({
      diagnosticsReturned: "API diagnostics available",
    });

    expect(loggingMessages.diagnosticsReturned).toBe(
      "API diagnostics available",
    );
  });

  it("overrides function messages", () => {
    setLoggingMessages({
      bicepVersionInstalled: (version: string, path: string) =>
        `Bicep ${version} installed at ${path}`,
    });

    expect(
      loggingMessages.bicepVersionInstalled("2.0.0", "/usr/bin/bicep"),
    ).toBe("Bicep 2.0.0 installed at /usr/bin/bicep");
  });

  it("resets to default messages", () => {
    setLoggingMessages({
      diagnosticsReturned: "Custom message",
    });

    expect(loggingMessages.diagnosticsReturned).toBe("Custom message");

    resetLoggingMessages();

    expect(loggingMessages.diagnosticsReturned).toBe(
      "Diagnostics returned by the API",
    );
  });

  it("handles multiple overrides correctly", () => {
    setLoggingMessages({
      diagnosticsReturned: "First override",
    });
    expect(loggingMessages.diagnosticsReturned).toBe("First override");

    setLoggingMessages({
      diagnosticsReturned: "Second override",
    });
    expect(loggingMessages.diagnosticsReturned).toBe("Second override");
  });

  it("does not affect unoverridden messages", () => {
    setLoggingMessages({
      diagnosticsReturned: "Custom diagnostics",
    });

    expect(loggingMessages.diagnosticsReturned).toBe("Custom diagnostics");
    expect(loggingMessages.bicepVersionInstalled("1.0.0", "/path")).toBe(
      "Installed Bicep version 1.0.0 to /path",
    );
  });
});
