// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from "vitest";
import {
  errorMessages,
  setErrorMessages,
  resetErrorMessages,
  ErrorMessageConfig,
} from "../src/errorMessages";

describe("errorMessages", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    resetErrorMessages();
  });

  it("should return default error messages", () => {
    expect(errorMessages.createFailed).toBe("Create failed");
    expect(errorMessages.validationFailed).toBe("Validation failed");
    expect(errorMessages.operationFailed).toBe("Operation failed");
    expect(errorMessages.locationRequired).toBe("Location is required");
    expect(errorMessages.failedToDetermineScope).toBe(
      "Failed to determine deployment scope from Bicep file.",
    );
    expect(errorMessages.templateFileRequired).toBe(
      "Template file is required",
    );
  });

  it("should return default function-based error messages", () => {
    expect(errorMessages.requestFailedCorrelation("abc123")).toBe(
      "Request failed. CorrelationId: abc123",
    );
    expect(errorMessages.inputMustBeBoolean("testInput")).toBe(
      "Input 'testInput' must be a boolean value",
    );
    expect(errorMessages.inputRequired("requiredInput")).toBe(
      "Input 'requiredInput' is required but not provided",
    );
    expect(
      errorMessages.inputMustBeEnum("enumInput", ["option1", "option2"]),
    ).toBe(
      "Input 'enumInput' must be one of the following values: 'option1', 'option2'",
    );
    expect(errorMessages.inputMustBeValidObject("objectInput")).toBe(
      "Input 'objectInput' must be a valid JSON or YAML object",
    );
    expect(errorMessages.inputMustBeStringObject("stringObjectInput")).toBe(
      "Input 'stringObjectInput' must be a valid JSON or YAML object containing only string values",
    );
    expect(errorMessages.unsupportedParametersFile("test.yaml")).toBe(
      "Unsupported parameters file type: test.yaml",
    );
    expect(errorMessages.unsupportedTemplateFile("test.txt")).toBe(
      "Unsupported template file type: test.txt",
    );
    expect(errorMessages.invalidChangeType("Unknown")).toBe(
      "Invalid ChangeType: Unknown",
    );
    expect(errorMessages.unknownPropertyChangeType("NewType")).toBe(
      "Unknown property change type: NewType.",
    );
    expect(errorMessages.invalidJsonValue(123)).toBe("Invalid JSON value: 123");
  });

  it("should override string error messages", () => {
    setErrorMessages({
      createFailed: "Custom create failed message",
    });

    expect(errorMessages.createFailed).toBe("Custom create failed message");
  });

  it("should override function-based error messages", () => {
    setErrorMessages({
      requestFailedCorrelation: id => `Custom correlation error: ${id}`,
    });

    expect(errorMessages.requestFailedCorrelation("xyz789")).toBe(
      "Custom correlation error: xyz789",
    );
  });

  it("should override multiple messages at once", () => {
    const customMessages: Partial<ErrorMessageConfig> = {
      createFailed: "Deployment creation failed",
      requestFailedCorrelation: id => `Request failed with ID: ${id}`,
    };

    setErrorMessages(customMessages);

    expect(errorMessages.createFailed).toBe("Deployment creation failed");
    expect(errorMessages.requestFailedCorrelation("test")).toBe(
      "Request failed with ID: test",
    );
  });

  it("should reset error messages to defaults", () => {
    // Override messages
    setErrorMessages({
      createFailed: "Custom message",
    });

    expect(errorMessages.createFailed).toBe("Custom message");

    // Reset to defaults
    resetErrorMessages();

    expect(errorMessages.createFailed).toBe("Create failed");
  });

  it("should handle multiple overrides", () => {
    setErrorMessages({ createFailed: "First override" });
    expect(errorMessages.createFailed).toBe("First override");

    setErrorMessages({ createFailed: "Second override" });
    expect(errorMessages.createFailed).toBe("Second override");

    resetErrorMessages();
    expect(errorMessages.createFailed).toBe("Create failed");
  });

  it("should not affect unspecified messages when overriding", () => {
    setErrorMessages({
      createFailed: "Custom create",
    });

    // These should still be defaults
    expect(errorMessages.validationFailed).toBe("Validation failed");
  });
});
