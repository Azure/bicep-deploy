// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ScopeType } from "../src/config";
import { validateFileScope } from "../src/utils";

describe("validateFileScope", () => {
  it("should ignore empty template", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validateFileScope({ scope: { type: "subscription" } } as any, {
        templateContents: {},
      }),
    ).not.toThrow();
  });

  it("should ignore non-Bicep templates", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validateFileScope({ scope: { type: "subscription" } } as any, {
        templateContents: {
          $schema:
            "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
        },
      }),
    ).not.toThrow();
  });

  it("should validate Bicep templates", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validateFileScope({ scope: { type: "subscription" } } as any, {
        templateContents: {
          $schema:
            "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
          metadata: { _generator: { name: "bicep" } },
        },
      }),
    ).toThrow(
      "The target scope resourceGroup does not match the deployment scope subscription.",
    );
  });

  const schemaLookup: Record<ScopeType, string> = {
    tenant:
      "https://schema.management.azure.com/schemas/2019-08-01/tenantDeploymentTemplate.json#",
    managementGroup:
      "https://schema.management.azure.com/schemas/2019-08-01/managementGroupDeploymentTemplate.json#",
    subscription:
      "https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#",
    resourceGroup:
      "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  };

  const scopes: ScopeType[] = [
    "tenant",
    "managementGroup",
    "subscription",
    "resourceGroup",
  ];

  it.each(scopes)("should validate %s scope", scope => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validateFileScope({ scope: { type: scope } } as any, {
        templateContents: {
          $schema: schemaLookup[scope as ScopeType],
          metadata: { _generator: { name: "bicep" } },
        },
      }),
    ).not.toThrow();
  });
});
