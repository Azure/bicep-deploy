// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import type {
  DeploymentStacksDiagnostic,
  DeploymentStacksWhatIfChange,
  DeploymentStacksWhatIfResult,
} from "@azure/arm-resourcesdeploymentstacks";
import { formatDeploymentStacksWhatIfChange } from "../src/stackWhatIf";
import whatIf1 from "./files/stacks-what-if/what-if-1.json";
import whatIf2 from "./files/stacks-what-if/what-if-2.json";
import {
  expectedStacksWhatIf1,
  expectedStacksWhatIf2,
} from "./stackWhatIfReference";

const testStackResourceId =
  "/subscriptions/00000000-0000-0000-0000-000000000001/providers/Microsoft.Resources/deploymentStacks/testStack";

describe("formatDeploymentStacksWhatIfChange", () => {
  it("formats resource, deny settings, and deployment scope changes", () => {
    const changes: DeploymentStacksWhatIfChange = {
      resourceChanges: [
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo1",
          apiVersion: "2023-01-01",
          changeType: "modify",
          changeCertainty: "definite",
          resourceConfigurationChanges: {
            delta: [
              {
                path: "properties.accessTier",
                changeType: "modify",
                before: "Hot",
                after: "Cool",
              },
            ],
          },
        },
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p2/bar",
          changeType: "create",
          changeCertainty: "definite",
        },
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p3/baz",
          changeType: "detach",
          changeCertainty: "definite",
        },
      ],
      denySettingsChange: {
        delta: [
          {
            path: "mode",
            changeType: "modify",
            before: "none",
            after: "denyDelete",
          },
        ],
      },
      deploymentScopeChange: {
        before: "/subscriptions/00000000-0000-0000-0000-000000000001",
        after:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1",
      },
    };

    const result = formatDeploymentStacksWhatIfChange(
      createWhatIfResult(changes),
      "debug",
    );

    expect(result).toContain("Resource and property changes are indicated");
    expect(result).toContain("<GREEN>+<RESET> Create");
    expect(result).toContain("! Unsupported");
    expect(result).toContain("<MAGENTA>~<RESET> Modify");
    expect(result).toContain("<BLUE>v<RESET> Detach");
    expect(result).toContain(`Changes to Stack ${testStackResourceId}:`);
    expect(result).toContain("Changes to Managed Resources:");
    expect(result).toContain(
      '<MAGENTA>~<RESET> DeploymentScope: <MAGENTA>"/subscriptions/00000000-0000-0000-0000-000000000001"<RESET> => <MAGENTA>"/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1"<RESET>',
    );
    expect(result).toContain(
      '<MAGENTA>~<RESET> DenySettings.mode: <MAGENTA>"none"<RESET> => <MAGENTA>"denyDelete"<RESET>',
    );
    expect(result).toContain("p2/bar");
    expect(result).toContain("p3/baz");
    expect(result).toContain("p1/foo1 [2023-01-01]");
    expect(result).not.toContain("Resource changes:");
  });

  it("renders only the legend when there are no resource changes", () => {
    const changes: DeploymentStacksWhatIfChange = {
      resourceChanges: [],
      denySettingsChange: {},
    };

    const result = formatDeploymentStacksWhatIfChange(
      createWhatIfResult(changes),
      "debug",
    );

    expect(result).toContain("Resource and property changes are indicated");
    expect(result).not.toContain("Changes to Managed Resources:");
    expect(result).not.toContain("Diagnostics (");
  });

  it("renders NoEffect property changes with a gray cross", () => {
    const changes: DeploymentStacksWhatIfChange = {
      denySettingsChange: {},
      resourceChanges: [
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/Microsoft.Test/widgets/test",
          changeType: "modify",
          changeCertainty: "definite",
          resourceConfigurationChanges: {
            delta: [
              {
                path: "sku.tier",
                changeType: "noEffect",
                after: "Standard",
              },
            ],
          },
        },
      ],
    };

    const result = formatDeploymentStacksWhatIfChange(
      createWhatIfResult(changes),
      "debug",
    );

    expect(result).toContain("<GRAY>x<RESET> NoEffect");
    expect(result).toContain(
      '<GRAY>x<RESET> sku.tier: <GRAY>"Standard"<RESET>',
    );
  });

  it("formats resource configuration snapshots for creates and deletes", () => {
    const changes: DeploymentStacksWhatIfChange = {
      denySettingsChange: {},
      resourceChanges: [
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/Microsoft.Test/widgets/created",
          changeType: "create",
          changeCertainty: "definite",
          resourceConfigurationChanges: {
            after: {
              apiVersion: "2023-01-01",
              id: "created-resource-id",
              location: "westus",
              name: "created",
              type: "Microsoft.Test/widgets",
              properties: { value: "created-value" },
            },
            delta: [],
          },
        },
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/Microsoft.Test/widgets/deleted",
          changeType: "delete",
          changeCertainty: "definite",
          resourceConfigurationChanges: {
            before: {
              apiVersion: "2023-01-01",
              id: "deleted-resource-id",
              location: "westus",
              name: "deleted",
              type: "Microsoft.Test/widgets",
              properties: { value: "deleted-value" },
            },
            delta: [],
          },
        },
      ],
    };

    const result = formatDeploymentStacksWhatIfChange(
      createWhatIfResult(changes),
      "debug",
    );

    expect(result).toContain("<GREEN>+<RESET> properties: <GREEN>{<RESET>");
    expect(result).toContain('<GREEN>  "value": "created-value"<RESET>');
    expect(result).toContain("<RED>-<RESET> properties: <RED>{<RESET>");
    expect(result).toContain('<RED>  "value": "deleted-value"<RESET>');
    expect(result).not.toContain("apiVersion:");
    expect(result).not.toContain("type:");
    expect(result).not.toContain("name:");
  });

  it("formats what-if example 1 exactly like the Azure CLI tests", () => {
    expect(
      formatDeploymentStacksWhatIfChange(
        whatIf1 as unknown as DeploymentStacksWhatIfResult,
        "debug",
      ),
    ).toBe(expectedStacksWhatIf1);
  });

  it("formats what-if example 2 exactly like the Azure CLI tests", () => {
    expect(
      formatDeploymentStacksWhatIfChange(
        whatIf2 as unknown as DeploymentStacksWhatIfResult,
        "debug",
      ),
    ).toBe(expectedStacksWhatIf2);
  });
});

function createWhatIfResult(
  changes: DeploymentStacksWhatIfChange,
  diagnostics: DeploymentStacksDiagnostic[] = [],
): DeploymentStacksWhatIfResult {
  return {
    properties: {
      changes,
      deploymentStackResourceId: testStackResourceId,
      diagnostics,
    },
  } as unknown as DeploymentStacksWhatIfResult;
}
