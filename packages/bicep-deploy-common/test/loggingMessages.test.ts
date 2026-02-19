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
    expect(loggingMessages.requestFailedCorrelation("test-id")).toBe(
      "Request failed. CorrelationId: test-id",
    );
    expect(loggingMessages.requestFailedCorrelation(null)).toBe(
      "Request failed. CorrelationId: null",
    );
    expect(loggingMessages.bicepCacheHit("1.2.3", "/path/to/bicep")).toBe(
      "Using cached Bicep version 1.2.3 from /path/to/bicep",
    );
    expect(loggingMessages.bicepDownloading("0.32.4")).toBe(
      "Downloading Bicep version 0.32.4...",
    );
    expect(
      loggingMessages.startingOperation(
        "deployment",
        "create",
        "resourceGroup",
        "my-rg",
        "my-deployment",
      ),
    ).toBe(
      "Starting deployment create at resourceGroup 'my-rg' scope with name 'my-deployment'",
    );
    expect(
      loggingMessages.startingOperation(
        "deploymentStack",
        "validate",
        "subscription",
        "1234",
        "",
      ),
    ).toBe("Starting deploymentStack validate at subscription '1234' scope");
    expect(
      loggingMessages.startingOperation(
        "deployment",
        "create",
        "tenant",
        "",
        "my-deployment",
      ),
    ).toBe(
      "Starting deployment create at tenant scope with name 'my-deployment'",
    );
    expect(loggingMessages.usingTemplateFile("./main.bicep")).toBe(
      "Using template file: ./main.bicep",
    );
    expect(loggingMessages.usingParametersFile("./main.bicepparam")).toBe(
      "Using parameters file: ./main.bicepparam",
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
      bicepCacheHit: (version: string, path: string) =>
        `Bicep ${version} cached at ${path}`,
    });

    expect(loggingMessages.bicepCacheHit("2.0.0", "/usr/bin/bicep")).toBe(
      "Bicep 2.0.0 cached at /usr/bin/bicep",
    );
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
    expect(loggingMessages.bicepCacheHit("1.0.0", "/path")).toBe(
      "Using cached Bicep version 1.0.0 from /path",
    );
  });
});
