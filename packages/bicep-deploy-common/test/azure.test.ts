// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  createHttpHeaders,
  createPipelineRequest,
  PipelineResponse,
} from "@azure/core-rest-pipeline";
import { DeploymentStacksClient } from "@azure/arm-resourcesdeploymentstacks";
import { DeploymentsClient } from "@azure/arm-resourcesdeployments";

import {
  createDebugLoggingPolicy,
  createPollingErrorPolicy,
  CustomPollingError,
} from "../src/azure";
import { tryWithErrorHandling } from "../src/utils";
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

  describe("Azure SDK polling errors", () => {
    const error = {
      code: "DeploymentFailed",
      message: "The deployment failed.",
      details: [
        {
          code: "ResourceNotFound",
          message: "The requested resource does not exist.",
        },
      ],
    };
    const credential = {
      getToken: async () => ({
        token: "test-token",
        expiresOnTimestamp: Date.now() + 3600000,
      }),
    };
    const subscriptionId = "00000000-0000-0000-0000-000000000000";

    it.each(["deployment", "stack"] as const)(
      "preserves nested errors from a failed %s status poll",
      async kind => {
        const sendRequest = vi.fn().mockImplementation(request => ({
          request,
          status: sendRequest.mock.calls.length === 1 ? 202 : 200,
          headers: createHttpHeaders({
            "content-type": "application/json",
            "azure-asyncoperation":
              "https://management.azure.com/operations/test",
            location: "https://management.azure.com/operations/test",
            "retry-after": "0",
            "x-ms-correlation-request-id": "poll-correlation",
          }),
          bodyAsText: JSON.stringify(
            sendRequest.mock.calls.length === 1
              ? { status: "Running" }
              : { status: "Failed", error },
          ),
        }));
        const options = {
          httpClient: { sendRequest },
          additionalPolicies: [createPollingErrorPolicy()],
        };
        const onError = vi.fn();
        const logger = new TestLogger();

        await tryWithErrorHandling(
          async () => {
            if (kind === "deployment") {
              const client = new DeploymentsClient(
                credential,
                subscriptionId,
                options,
              );
              await client.deployments.createOrUpdate(
                "test-rg",
                "test-deploy",
                { properties: { mode: "Incremental", template: {} } },
              );
            } else {
              const client = new DeploymentStacksClient(
                credential,
                subscriptionId,
                options,
              );
              await client.deploymentStacks.createOrUpdateAtResourceGroup(
                "test-rg",
                "test-stack",
                {
                  properties: {
                    template: {},
                    actionOnUnmanage: { resources: "detach" },
                    denySettings: { mode: "none" },
                  },
                },
              );
            }
          },
          onError,
          logger,
        );

        expect(sendRequest).toHaveBeenCalledTimes(2);
        expect(onError).toHaveBeenCalledExactlyOnceWith(error);
        expect(logger.getExternalMessages("remote", "error")).toEqual([
          "Request failed. CorrelationId: poll-correlation",
        ]);
      },
    );

    it.each([
      {
        description: "a failed poll",
        status: 200,
        body: { status: "Failed", error },
      },
      {
        description: "an operation containing an error",
        status: 200,
        body: { status: "Succeeded", error },
      },
      { description: "an HTTP error response", status: 400, body: { error } },
    ])(
      "captures structured errors from $description",
      async ({ status, body }) => {
        const request = createPipelineRequest({
          url: "https://management.azure.com/operations/test",
        });
        const response: PipelineResponse = {
          request,
          status,
          headers: createHttpHeaders(),
          bodyAsText: JSON.stringify(body),
        };
        const result = createPollingErrorPolicy().policy.sendRequest(
          request,
          vi.fn().mockResolvedValue(response),
        );

        await expect(result).rejects.toBeInstanceOf(Error);
        await expect(result).rejects.toBeInstanceOf(CustomPollingError);
        await expect(result).rejects.toMatchObject({
          name: "CustomPollingError",
          message: error.message,
          details: { error },
          response,
        });
      },
    );

    it.each([
      undefined,
      "",
      "not JSON",
      "null",
      "[]",
      JSON.stringify({ status: "Succeeded" }),
      JSON.stringify({ error: null }),
      JSON.stringify({ error: { code: "Invalid" } }),
      JSON.stringify({ error: { message: "Invalid" } }),
      JSON.stringify({ error: { code: 123, message: "Invalid" } }),
    ])("leaves unrecognized response %j to SDK handling", async bodyAsText => {
      const request = createPipelineRequest({
        url: "https://management.azure.com/operations/test",
      });
      const response: PipelineResponse = {
        request,
        status: 200,
        headers: createHttpHeaders(),
        bodyAsText,
      };
      const next = vi.fn().mockResolvedValue(response);

      await expect(
        createPollingErrorPolicy().policy.sendRequest(request, next),
      ).resolves.toBe(response);
      expect(next).toHaveBeenCalledExactlyOnceWith(request);
    });

    it("propagates transport failures unchanged", async () => {
      const request = createPipelineRequest({
        url: "https://management.azure.com/operations/test",
      });
      const failure = new Error("Connection failed");

      await expect(
        createPollingErrorPolicy().policy.sendRequest(
          request,
          vi.fn().mockRejectedValue(failure),
        ),
      ).rejects.toBe(failure);
    });
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

describe("Azure SDK polling errors", () => {
  const error = {
    code: "DeploymentFailed",
    message: "The deployment failed.",
    details: [
      {
        code: "ResourceNotFound",
        message: "The requested resource does not exist.",
      },
    ],
  };

  it("captures a failed polling response in CustomPollingError", async () => {
    const sendRequest = vi.fn().mockImplementation(request => ({
      request,
      status: sendRequest.mock.calls.length === 1 ? 202 : 200,
      headers: createHttpHeaders({
        "content-type": "application/json",
        "azure-asyncoperation": "https://management.azure.com/operations/test",
        location: "https://management.azure.com/operations/test",
        "retry-after": "0",
        "x-ms-correlation-request-id": "poll-correlation",
      }),
      bodyAsText: JSON.stringify(
        sendRequest.mock.calls.length === 1
          ? { status: "Running" }
          : { status: "Failed", error },
      ),
    }));
    const client = new DeploymentsClient(
      {
        getToken: async () => ({
          token: "test-token",
          expiresOnTimestamp: Date.now() + 3600000,
        }),
      },
      "00000000-0000-0000-0000-000000000000",
      {
        httpClient: { sendRequest },
        additionalPolicies: [createPollingErrorPolicy()],
      },
    );
    const onError = vi.fn();
    const logger = new TestLogger();

    await tryWithErrorHandling(
      () =>
        client.deployments.createOrUpdate("test-rg", "test-deploy", {
          properties: { mode: "Incremental", template: {} },
        }),
      onError,
      logger,
    );

    expect(sendRequest).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(logger.getExternalMessages("remote", "error")).toEqual([
      "Request failed. CorrelationId: poll-correlation",
    ]);
  });

  it("does not treat a successful operation as a polling error", async () => {
    const request = createPipelineRequest({
      url: "https://management.azure.com/operations/test",
    });
    const response: PipelineResponse = {
      request,
      status: 200,
      headers: createHttpHeaders({ "content-type": "application/json" }),
      bodyAsText: JSON.stringify({ status: "Succeeded", error }),
    };

    await expect(
      createPollingErrorPolicy().policy.sendRequest(
        request,
        vi.fn().mockResolvedValue(response),
      ),
    ).resolves.toBe(response);
  });

  it("leaves failed HTTP responses for the SDK to handle", async () => {
    const request = createPipelineRequest({
      url: "https://management.azure.com/deployment",
    });
    const response: PipelineResponse = {
      request,
      status: 400,
      headers: createHttpHeaders({ "content-type": "application/json" }),
      bodyAsText: JSON.stringify({ error }),
    };

    await expect(
      createPollingErrorPolicy().policy.sendRequest(
        request,
        vi.fn().mockResolvedValue(response),
      ),
    ).resolves.toBe(response);
  });
});
