// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  createHttpHeaders,
  createPipelineRequest,
  PipelineResponse,
} from "@azure/core-rest-pipeline";

import { createDebugLoggingPolicy } from "../src/azure";
import { TestLogger } from "./logging";

describe("Azure SDK debug logging", () => {
  it("logs request and response metadata without payload bodies", async () => {
    const logger = new TestLogger();
    const request = createPipelineRequest({
      url: "https://management.azure.com/subscriptions/repository-path",
      method: "POST",
      body: JSON.stringify({
        properties: {
          parameters: {
            secretParameter: { value: "request-secret-marker" },
          },
        },
      }),
    });
    const response: PipelineResponse = {
      request,
      status: 200,
      headers: createHttpHeaders({
        "x-ms-correlation-request-id": "remote-correlation",
        "x-ms-request-id": "remote-activity",
      }),
      bodyAsText: JSON.stringify({
        properties: {
          outputs: {
            secretOutput: { value: "response-output-marker" },
          },
          nested: [
            {
              error: {
                details: [{ value: "response-error-marker" }],
              },
            },
          ],
        },
      }),
    };
    const next = vi.fn().mockResolvedValue(response);
    const policy = createDebugLoggingPolicy(logger).policy;

    await policy.sendRequest(request, next);

    expect(next).toHaveBeenCalledExactlyOnceWith(request);
    expect(logger.externalLogs).toEqual([
      {
        message:
          "Request: POST https://management.azure.com/subscriptions/repository-path",
        source: "repository",
        level: "debug",
      },
      {
        message: "Response: 200",
        source: "remote",
        level: "debug",
      },
      {
        message: "CorrelationId: remote-correlation",
        source: "remote",
        level: "debug",
      },
      {
        message: "ActivityId: remote-activity",
        source: "remote",
        level: "debug",
      },
    ]);
    const loggedOutput = JSON.stringify(logger.externalLogs);
    expect(loggedOutput).not.toContain("request-secret-marker");
    expect(loggedOutput).not.toContain("response-output-marker");
    expect(loggedOutput).not.toContain("response-error-marker");
    expect(loggedOutput).not.toContain("Body:");
  });

  it("does not parse arbitrary request or response bodies", async () => {
    const logger = new TestLogger();
    const request = createPipelineRequest({
      url: "https://management.azure.com/subscriptions/repository-path",
      method: "POST",
      body: "non-json-request-marker",
    });
    const response: PipelineResponse = {
      request,
      status: 202,
      headers: createHttpHeaders(),
      bodyAsText: "non-json-response-marker",
    };
    const next = vi.fn().mockResolvedValue(response);
    const policy = createDebugLoggingPolicy(logger).policy;

    await expect(policy.sendRequest(request, next)).resolves.toBe(response);

    expect(JSON.stringify(logger.externalLogs)).not.toContain("non-json");
  });

  it("does not log metadata when debug logging is disabled", async () => {
    const logger = new TestLogger();
    logger.isDebugEnabled = () => false;
    const request = createPipelineRequest({
      url: "https://management.azure.com/subscriptions/repository-path",
      method: "POST",
      body: "request-marker",
    });
    const response: PipelineResponse = {
      request,
      status: 200,
      headers: createHttpHeaders(),
      bodyAsText: "response-marker",
    };
    const next = vi.fn().mockResolvedValue(response);
    const policy = createDebugLoggingPolicy(logger).policy;

    await policy.sendRequest(request, next);

    expect(next).toHaveBeenCalledExactlyOnceWith(request);
    expect(logger.externalLogs).toEqual([]);
  });
});
