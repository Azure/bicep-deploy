// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  createHttpHeaders,
  createPipelineRequest,
  HttpClient,
  HttpMethods,
  PipelineRequest,
  PipelineResponse,
} from "@azure/core-rest-pipeline";
import { DeploymentExtended } from "@azure/arm-resources";
import { TokenCredential } from "@azure/identity";

const transport = vi.hoisted(() => ({
  requests: [] as { method: string; path: string; time: number }[],
  handler: undefined as
    | undefined
    | ((request: PipelineRequest) => PipelineResponse),
  cliCredentialTenants: [] as (string | undefined)[],
}));

vi.mock("@azure/identity", async importOriginal => {
  const actual = await importOriginal<typeof import("@azure/identity")>();
  class AzureCliCredential extends actual.AzureCliCredential {
    constructor(
      options?: ConstructorParameters<typeof actual.AzureCliCredential>[0],
    ) {
      super(options);
      transport.cliCredentialTenants.push(options?.tenantId);
    }
  }
  return { ...actual, AzureCliCredential };
});

vi.mock("../src/azure", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/azure")>();
  const httpClient: HttpClient = {
    async sendRequest(request) {
      transport.requests.push({
        method: request.method,
        path: new URL(request.url).pathname,
        time: Date.now(),
      });
      if (!transport.handler) {
        throw new Error("No transport handler configured");
      }
      return transport.handler(request);
    },
  };
  const credential: TokenCredential = {
    async getToken() {
      return { token: "token", expiresOnTimestamp: Date.now() + 3_600_000 };
    },
  };

  return {
    ...actual,
    createDeploymentClient: (
      ...[config, logger, subscriptionId, tenantId, options]: Parameters<
        typeof actual.createDeploymentClient
      >
    ) =>
      actual.createDeploymentClient(config, logger, subscriptionId, tenantId, {
        ...options,
        httpClient,
        credential,
      }),
    getDeploymentCreateClient: (
      ...[config, scope, logger]: Parameters<
        typeof actual.getDeploymentCreateClient
      >
    ) =>
      actual.getDeploymentCreateClient(config, scope, logger, {
        httpClient,
        credential,
      }),
  };
});

import {
  createDeploymentClient,
  createDeploymentInitialPollDelayPolicy,
  createStacksClient,
  deploymentInitialPollDelayPolicyName,
  getDeploymentCreateClient,
  initialCreateStatusPollDelayMs,
  isDeploymentOperationStatusRequest,
} from "../src/azure";
import { DeploymentsConfig } from "../src/config";
import {
  deploymentCreate,
  deploymentValidate,
  deploymentWhatIf,
} from "../src/deployments";
import { ParsedFiles } from "../src/file";
import { CustomPollingError } from "../src/azure";
import { TestLogger } from "./logging";

const origin = "https://management.azure.com";
const files: ParsedFiles = {
  templateContents: {
    $schema:
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    contentVersion: "1.0.0.0",
    resources: [],
  },
  parametersContents: { parameters: {} },
};
const outputs = { result: { type: "String", value: "ok" } };

const configs: Record<
  "resourceGroup" | "subscription" | "managementGroup" | "tenant",
  DeploymentsConfig
> = {
  resourceGroup: {
    type: "deployment",
    operation: "create",
    environment: "azureCloud",
    name: "test",
    scope: {
      type: "resourceGroup",
      subscriptionId: "sub",
      resourceGroup: "rg",
    },
    whatIf: {},
  },
  subscription: {
    type: "deployment",
    operation: "create",
    environment: "azureCloud",
    name: "test",
    location: "eastus",
    scope: { type: "subscription", subscriptionId: "sub" },
    whatIf: {},
  },
  managementGroup: {
    type: "deployment",
    operation: "create",
    environment: "azureCloud",
    name: "test",
    location: "eastus",
    scope: { type: "managementGroup", managementGroup: "mg" },
    whatIf: {},
  },
  tenant: {
    type: "deployment",
    operation: "create",
    environment: "azureCloud",
    name: "test",
    location: "eastus",
    scope: { type: "tenant" },
    whatIf: {},
  },
};

function respond(
  request: PipelineRequest,
  status: number,
  body?: object,
  headers: Record<string, string> = {},
): PipelineResponse {
  return {
    request,
    status,
    headers: createHttpHeaders({
      "content-type": "application/json",
      ...headers,
    }),
    bodyAsText: body ? JSON.stringify(body) : undefined,
  };
}

function deploymentBody(path: string, provisioningState: string) {
  return {
    id: path,
    name: "test",
    properties: {
      provisioningState,
      outputs: provisioningState === "Succeeded" ? outputs : undefined,
    },
  };
}

function statusUrl(deploymentPath: string, sequence = "08584") {
  return `${origin}${deploymentPath}/operationStatuses/${sequence}?api-version=2024-03-01`;
}

interface ScenarioOptions {
  initialStatus?: number;
  initialState?: string;
  initialHeaders?: (deploymentPath: string) => Record<string, string>;
  statusResponses?: ((
    request: PipelineRequest,
    deploymentPath: string,
  ) => PipelineResponse)[];
}

// Simulates ARM for one deployment operation. Status GETs consume
// statusResponses in order, then report success.
function useScenario(options: ScenarioOptions = {}) {
  const statusResponses = [...(options.statusResponses ?? [])];
  let deploymentPath = "";

  transport.handler = request => {
    const path = new URL(request.url).pathname;
    if (request.method === "PUT" || request.method === "POST") {
      deploymentPath = path.replace(/\/(validate|whatIf)$/i, "");
      return respond(
        request,
        options.initialStatus ?? 201,
        deploymentBody(deploymentPath, options.initialState ?? "Accepted"),
        options.initialHeaders?.(deploymentPath) ?? {
          "azure-asyncoperation": statusUrl(deploymentPath),
        },
      );
    }

    if (/\/operation(Statuses|Results)\//i.test(path)) {
      const next = statusResponses.shift();
      return next
        ? next(request, deploymentPath)
        : respond(request, 200, { status: "Succeeded" });
    }

    return respond(request, 200, deploymentBody(deploymentPath, "Succeeded"));
  };
}

function statusGets() {
  return transport.requests.filter(
    r => r.method === "GET" && /\/operationStatuses\//i.test(r.path),
  );
}

describe("deployment operation-status predicate", () => {
  const prefixes = [
    "/subscriptions/sub/resourceGroups/rg",
    "/subscriptions/sub",
    "/providers/Microsoft.Management/managementGroups/mg",
    "",
  ];

  it.each(prefixes)("matches operation-status polls under '%s'", prefix => {
    expect(
      isDeploymentOperationStatusRequest({
        method: "GET",
        url: `${origin}${prefix}/providers/Microsoft.Resources/deployments/test/operationStatuses/08584?api-version=2024-03-01`,
      }),
    ).toBe(true);
  });

  it.each([
    "https://management.chinacloudapi.cn/subscriptions/sub/providers/Microsoft.Resources/deployments/test/operationStatuses/1",
    "https://management.azure.com/subscriptions/sub/providers/microsoft.resources/DEPLOYMENTS/test/OPERATIONSTATUSES/1/",
  ])("ignores host, query, and casing differences: %s", url => {
    expect(
      isDeploymentOperationStatusRequest({
        method: "get" as string as HttpMethods,
        url,
      }),
    ).toBe(true);
  });

  it.each<[HttpMethods, string]>([
    [
      "PUT",
      "/subscriptions/sub/providers/Microsoft.Resources/deployments/test/operationStatuses/1",
    ],
    [
      "GET",
      "/subscriptions/sub/providers/Microsoft.Resources/deployments/test",
    ],
    [
      "GET",
      "/subscriptions/sub/providers/Microsoft.Resources/deployments/test/operations/1",
    ],
    [
      "POST",
      "/subscriptions/sub/providers/Microsoft.Resources/deployments/test/validate",
    ],
    [
      "POST",
      "/subscriptions/sub/providers/Microsoft.Resources/deployments/test/whatIf",
    ],
    [
      "GET",
      "/subscriptions/sub/providers/Microsoft.Resources/deploymentStacks/test/operationStatuses/1",
    ],
    [
      "GET",
      "/subscriptions/sub/providers/Microsoft.Resources/locations/eastus/operationStatuses/1",
    ],
    [
      "GET",
      "/subscriptions/sub/providers/Microsoft.Storage/deployments/test/operationStatuses/1",
    ],
    [
      "GET",
      "/subscriptions/sub/providers/Microsoft.Resources/deployments/test/operationStatuses/1/extra",
    ],
  ])("rejects %s %s", (method, path) => {
    expect(
      isDeploymentOperationStatusRequest({ method, url: `${origin}${path}` }),
    ).toBe(false);
  });

  it("rejects URLs that cannot be parsed", () => {
    expect(
      isDeploymentOperationStatusRequest({
        method: "GET",
        url: "/providers/Microsoft.Resources/deployments/test/operationStatuses/1",
      }),
    ).toBe(false);
  });
});

describe("deployment initial poll delay policy", () => {
  const matchingUrl = `${origin}/subscriptions/sub/providers/Microsoft.Resources/deployments/test/operationStatuses/1`;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function okNext() {
    return vi.fn(async (request: PipelineRequest) => respond(request, 200));
  }

  it("delays only the first matching request", async () => {
    const { policy } = createDeploymentInitialPollDelayPolicy();
    const next = okNext();

    const first = policy.sendRequest(
      createPipelineRequest({ url: matchingUrl, method: "GET" }),
      next,
    );
    await vi.advanceTimersByTimeAsync(initialCreateStatusPollDelayMs - 1);
    expect(next).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await first;
    expect(next).toHaveBeenCalledOnce();

    await policy.sendRequest(
      createPipelineRequest({ url: matchingUrl, method: "GET" }),
      next,
    );
    expect(next).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not allocate a timer for nonmatching requests", async () => {
    const { policy } = createDeploymentInitialPollDelayPolicy();
    const next = okNext();

    await policy.sendRequest(
      createPipelineRequest({
        url: `${origin}/subscriptions/sub/providers/Microsoft.Resources/deployments/test`,
        method: "PUT",
      }),
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not send when already aborted", async () => {
    const { policy } = createDeploymentInitialPollDelayPolicy();
    const next = okNext();
    const controller = new AbortController();
    controller.abort();

    await expect(
      policy.sendRequest(
        createPipelineRequest({
          url: matchingUrl,
          method: "GET",
          abortSignal: controller.signal,
        }),
        next,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(next).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops waiting and does not send when aborted during the delay", async () => {
    const { policy } = createDeploymentInitialPollDelayPolicy();
    const next = okNext();
    const controller = new AbortController();

    const result = policy
      .sendRequest(
        createPipelineRequest({
          url: matchingUrl,
          method: "GET",
          abortSignal: controller.signal,
        }),
        next,
      )
      .catch(error => error);
    await vi.advanceTimersByTimeAsync(1_000);
    controller.abort();

    await expect(result).resolves.toMatchObject({ name: "AbortError" });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(initialCreateStatusPollDelayMs);
    expect(next).not.toHaveBeenCalled();
  });

  it("removes the abort listener when the delay completes", async () => {
    const { policy } = createDeploymentInitialPollDelayPolicy();
    const next = okNext();
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");

    const result = policy.sendRequest(
      createPipelineRequest({
        url: matchingUrl,
        method: "GET",
        abortSignal: controller.signal,
      }),
      next,
    );
    await vi.advanceTimersByTimeAsync(initialCreateStatusPollDelayMs);
    await result;

    expect(add).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledExactlyOnceWith(
      "abort",
      add.mock.calls[0][1],
    );
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("deployment client pipeline", () => {
  function policyNames(client: {
    pipeline: { getOrderedPolicies(): { name: string }[] };
  }) {
    return client.pipeline.getOrderedPolicies().map(p => p.name);
  }

  it("places the delay once, after request setup and before debug logging, authentication, and retry", () => {
    const names = policyNames(
      getDeploymentCreateClient(
        configs.subscription,
        configs.subscription.scope,
        new TestLogger(),
      ),
    );
    const delay = names.indexOf(deploymentInitialPollDelayPolicyName);

    expect(
      names.filter(n => n === deploymentInitialPollDelayPolicyName),
    ).toHaveLength(1);
    expect(delay).toBeGreaterThan(names.indexOf("setClientRequestIdPolicy"));
    expect(names[delay + 1]).toBe("debugLoggingPolicy");
    for (const later of [
      "bearerTokenAuthenticationPolicy",
      "deserializationPolicy",
      "defaultRetryPolicy",
      "redirectPolicy",
    ]) {
      expect(names.indexOf(later)).toBeGreaterThan(delay);
    }
  });

  it("omits the delay from the shared deployment client", () => {
    const shared = policyNames(
      createDeploymentClient(configs.subscription, new TestLogger(), "sub"),
    );
    const create = policyNames(
      getDeploymentCreateClient(
        configs.subscription,
        configs.subscription.scope,
        new TestLogger(),
      ),
    );

    expect(shared).toEqual(
      create.filter(name => name !== deploymentInitialPollDelayPolicyName),
    );
  });

  it("omits the delay from the stacks client", () => {
    const client = createStacksClient(
      configs.subscription,
      new TestLogger(),
      "sub",
    );

    expect(policyNames(client)).not.toContain(
      deploymentInitialPollDelayPolicyName,
    );
  });
});

describe("deployment create client scope derivation", () => {
  beforeEach(() => {
    transport.cliCredentialTenants = [];
  });

  it.each([
    [{ ...configs.resourceGroup.scope, tenantId: "tid" }, "sub"],
    [{ ...configs.subscription.scope, tenantId: "tid" }, "sub"],
    [
      { ...configs.managementGroup.scope, tenantId: "tid" },
      "00000000-0000-0000-0000-000000000000",
    ],
    [
      { ...configs.tenant.scope, tenantId: "tid" },
      "00000000-0000-0000-0000-000000000000",
    ],
  ])(
    "derives subscription and tenant for %o",
    async (scope, subscriptionId) => {
      const actual =
        await vi.importActual<typeof import("../src/azure")>("../src/azure");

      const client = actual.getDeploymentCreateClient(
        configs.subscription,
        scope,
        new TestLogger(),
      );

      expect(client.subscriptionId).toBe(subscriptionId);
      expect(transport.cliCredentialTenants).toEqual(["tid"]);
    },
  );
});

describe("deploymentCreate with the real Azure SDK", () => {
  let logger: TestLogger;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    transport.requests = [];
    transport.handler = undefined;
    logger = new TestLogger();
  });

  afterEach(() => vi.useRealTimers());

  const expectedPutPaths: Record<keyof typeof configs, string> = {
    resourceGroup:
      "/subscriptions/sub/resourcegroups/rg/providers/Microsoft.Resources/deployments/test",
    subscription:
      "/subscriptions/sub/providers/Microsoft.Resources/deployments/test",
    managementGroup:
      "/providers/Microsoft.Management/managementGroups/mg/providers/Microsoft.Resources/deployments/test",
    tenant: "/providers/Microsoft.Resources/deployments/test",
  };

  it.each(
    Object.entries(configs) as [keyof typeof configs, DeploymentsConfig][],
  )(
    "waits five seconds before the first status poll at %s scope",
    async (scopeName, config) => {
      useScenario();
      const putPath = expectedPutPaths[scopeName];

      const deployment = deploymentCreate(config, files, logger);
      await vi.advanceTimersByTimeAsync(initialCreateStatusPollDelayMs - 1);

      expect(transport.requests).toEqual([
        { method: "PUT", path: putPath, time: 0 },
      ]);
      expect(
        logger
          .getExternalMessages("repository", "debug")
          .filter(m => m.includes("operationStatuses")),
      ).toEqual([]);

      await vi.advanceTimersByTimeAsync(1);
      const result = await deployment;

      expect(transport.requests).toEqual([
        { method: "PUT", path: putPath, time: 0 },
        {
          method: "GET",
          path: `${putPath}/operationStatuses/08584`,
          time: initialCreateStatusPollDelayMs,
        },
        { method: "GET", path: putPath, time: initialCreateStatusPollDelayMs },
      ]);
      expect(result.properties?.outputs).toEqual(outputs);
      expect(
        logger
          .getExternalMessages("repository", "debug")
          .filter(m => m.includes("operationStatuses")),
      ).toHaveLength(1);
    },
  );

  async function runCreate(): Promise<{
    value?: DeploymentExtended;
    error?: unknown;
  }> {
    const deployment = deploymentCreate(configs.subscription, files, logger);
    const settled = deployment.then(
      value => ({ value }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    return await settled;
  }

  const statuses = [200, 201, 202];
  const delayedModes: [string, (path: string) => Record<string, string>][] = [
    [
      "Azure-AsyncOperation only",
      path => ({ "azure-asyncoperation": statusUrl(path) }),
    ],
    [
      "Azure-AsyncOperation with Location",
      path => ({
        "azure-asyncoperation": statusUrl(path),
        location: `${origin}${path}?api-version=2024-03-01`,
      }),
    ],
    [
      "Operation-Location to the deployment status route",
      path => ({ "operation-location": statusUrl(path) }),
    ],
    [
      "Operation-Location to the status route over a nonmatching Azure-AsyncOperation",
      path => ({
        "operation-location": statusUrl(path),
        "azure-asyncoperation": otherStatusUrl,
      }),
    ],
  ];
  const otherStatusUrl = `${origin}/subscriptions/sub/providers/Microsoft.Resources/locations/eastus/operationResults/1?api-version=2024-03-01`;

  it.each(
    statuses.flatMap(status =>
      delayedModes.map(([mode, headers]) => [status, mode, headers] as const),
    ),
  )(
    "delays a %i create response with %s",
    async (initialStatus, _, initialHeaders) => {
      useScenario({ initialStatus, initialHeaders });

      const { value, error } = await runCreate();

      expect(error).toBeUndefined();
      expect(statusGets().map(r => r.time)).toEqual([
        initialCreateStatusPollDelayMs,
      ]);
      expect(transport.requests.filter(r => r.method === "PUT")).toHaveLength(
        1,
      );
      expect(value?.properties?.outputs).toEqual(outputs);
    },
  );

  const undelayedModes: [string, (path: string) => Record<string, string>][] = [
    [
      "Operation-Location to another route",
      () => ({ "operation-location": otherStatusUrl }),
    ],
    [
      "Operation-Location to another route over a matching Azure-AsyncOperation",
      path => ({
        "operation-location": otherStatusUrl,
        "azure-asyncoperation": statusUrl(path),
      }),
    ],
    [
      "Location only",
      path => ({ location: `${origin}${path}?api-version=2024-03-01` }),
    ],
    ["body polling", () => ({})],
  ];

  it.each(
    statuses.flatMap(status =>
      undelayedModes.map(([mode, headers]) => [status, mode, headers] as const),
    ),
  )(
    "does not delay a %i create response with %s",
    async (initialStatus, _, initialHeaders) => {
      useScenario({ initialStatus, initialHeaders });

      const { value, error } = await runCreate();

      expect(error).toBeUndefined();
      expect(transport.requests.length).toBeGreaterThan(1);
      expect(statusGets()).toEqual([]);
      expect(transport.requests.every(r => r.time === 0)).toBe(true);
      expect(value?.properties?.outputs).toEqual(outputs);
    },
  );

  it("sends no poll when the create response is terminal without polling headers", async () => {
    useScenario({
      initialStatus: 200,
      initialState: "Succeeded",
      initialHeaders: () => ({}),
    });

    const { value } = await runCreate();

    expect(transport.requests).toEqual([
      { method: "PUT", path: expect.any(String), time: 0 },
    ]);
    expect(value?.properties?.outputs).toEqual(outputs);
  });

  it("still delays the status poll when a terminal create response has Azure-AsyncOperation", async () => {
    useScenario({ initialStatus: 200, initialState: "Succeeded" });

    const { value } = await runCreate();

    expect(statusGets().map(r => r.time)).toEqual([
      initialCreateStatusPollDelayMs,
    ]);
    expect(value?.properties?.outputs).toEqual(outputs);
  });

  it("does not delay later polls when the operation URL changes", async () => {
    const running = (request: PipelineRequest, path: string) =>
      respond(
        request,
        200,
        { status: "Running" },
        {
          "azure-asyncoperation": statusUrl(path, "08585"),
          "retry-after": "1",
        },
      );
    useScenario({ statusResponses: [running, running] });

    const { value } = await runCreate();

    const polls = statusGets();
    expect(polls).toHaveLength(3);
    expect(polls[0].time).toBe(initialCreateStatusPollDelayMs);
    expect(polls[1].path).toMatch(/\/operationStatuses\/08585$/);
    expect(polls[1].time).toBe(initialCreateStatusPollDelayMs);
    // pollUntilDone() polls once immediately; Retry-After applies after that.
    expect(polls[2].path).toMatch(/\/operationStatuses\/08585$/);
    expect(polls[2].time).toBe(initialCreateStatusPollDelayMs + 1_000);
    expect(value?.properties?.outputs).toEqual(outputs);
  });

  it("lets default retry resend a failed status poll without another delay", async () => {
    useScenario({
      statusResponses: [
        request =>
          respond(
            request,
            503,
            { error: { code: "ServiceUnavailable", message: "busy" } },
            { "retry-after": "0" },
          ),
      ],
    });

    const { value } = await runCreate();

    const polls = statusGets();
    expect(polls).toHaveLength(2);
    expect(polls[0].time).toBe(initialCreateStatusPollDelayMs);
    expect(polls[1].time).toBeLessThan(2 * initialCreateStatusPollDelayMs);
    expect(transport.requests.filter(r => r.method === "PUT")).toHaveLength(1);
    expect(value?.properties?.outputs).toEqual(outputs);
  });

  it("does not interpret or retry a delayed DeploymentNotFound", async () => {
    useScenario({
      statusResponses: [
        request =>
          respond(
            request,
            404,
            {
              error: {
                code: "DeploymentNotFound",
                message: "Deployment 'test' could not be found.",
              },
            },
            {
              "x-ms-correlation-request-id": "corr-404",
              "x-ms-failure-cause": "gateway",
            },
          ),
      ],
    });

    const { error } = await runCreate();

    expect((error as object).constructor.name).toBe(CustomPollingError.name);
    const pollingError = error as CustomPollingError;
    expect(pollingError.response.status).toBe(404);
    expect(pollingError.response.request.url).toMatch(
      /\/operationStatuses\/08584\?/,
    );
    expect(
      pollingError.response.headers.get("x-ms-correlation-request-id"),
    ).toBe("corr-404");
    expect(pollingError.details).toEqual({
      error: {
        code: "DeploymentNotFound",
        message: "Deployment 'test' could not be found.",
      },
    });
    expect(statusGets().map(r => r.time)).toEqual([
      initialCreateStatusPollDelayMs,
    ]);
    expect(transport.requests.filter(r => r.method === "PUT")).toHaveLength(1);
  });

  it("delays once per create client", async () => {
    useScenario();
    await runCreate();
    const firstRun = statusGets();

    transport.requests = [];
    vi.setSystemTime(0);
    useScenario();
    await runCreate();

    expect(firstRun.map(r => r.time)).toEqual([initialCreateStatusPollDelayMs]);
    expect(statusGets().map(r => r.time)).toEqual([
      initialCreateStatusPollDelayMs,
    ]);
  });

  it.each([
    ["validate", deploymentValidate],
    ["what-if", deploymentWhatIf],
  ] as const)("does not delay %s status polling", async (operation, run) => {
    useScenario({
      initialStatus: 202,
      initialHeaders: path => ({
        "azure-asyncoperation": statusUrl(path),
        location: `${origin}${path}?api-version=2024-03-01`,
      }),
    });

    const result = run(
      {
        ...configs.subscription,
        operation: operation === "validate" ? "validate" : "whatIf",
      },
      files,
      logger,
    ).then(
      value => ({ value }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    const settled = await result;

    expect(settled).not.toHaveProperty("error");
    expect(statusGets().length).toBeGreaterThan(0);
    expect(transport.requests.every(r => r.time === 0)).toBe(true);
  });
});
