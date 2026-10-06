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
  it("classifies request data as repository output and response data as remote", async () => {
    const logger = new TestLogger();
    const request = createPipelineRequest({
      url: "https://management.azure.com/subscriptions/repository-value",
      method: "POST",
      body: JSON.stringify({ parameter: "repository-value" }),
    });
    const response: PipelineResponse = {
      request,
      status: 200,
      headers: createHttpHeaders({
        "x-ms-correlation-request-id": "remote-correlation",
        "x-ms-request-id": "remote-activity",
      }),
      bodyAsText: JSON.stringify({ result: "remote-value" }),
    };
    const next = vi.fn().mockResolvedValue(response);
    const policy = createDebugLoggingPolicy(logger).policy;

    await policy.sendRequest(request, next);

    expect(next).toHaveBeenCalledExactlyOnceWith(request);
    expect(logger.externalLogs).toEqual([
      {
        message:
          "Request: POST https://management.azure.com/subscriptions/repository-value",
        source: "repository",
        level: "debug",
      },
      {
        message: 'Body: {\n  "parameter": "repository-value"\n}',
        source: "repository",
        level: "debug",
      },
      {
        message: "Response: 200",
        source: "remote",
        level: "debug",
      },
      {
        message: 'Body: {\n  "result": "remote-value"\n}',
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
  });
});
