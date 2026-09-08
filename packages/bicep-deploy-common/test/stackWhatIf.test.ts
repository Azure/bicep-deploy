// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import {
  formatDeploymentStacksWhatIfChange,
  stackWhatIfHasChanges,
} from "../src/stackWhatIf";
import { DeploymentStacksWhatIfChange } from "@azure/arm-resourcesdeploymentstacks";

describe("stackWhatIfHasChanges", () => {
  it("returns false when there are no changes", () => {
    const changes: DeploymentStacksWhatIfChange = {
      resourceChanges: [
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo1",
          changeType: "noChange",
          changeCertainty: "definite",
        },
      ],
      denySettingsChange: {},
    };

    expect(stackWhatIfHasChanges(changes)).toBe(false);
  });

  it("returns true when a resource change is present", () => {
    const changes: DeploymentStacksWhatIfChange = {
      resourceChanges: [
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo1",
          changeType: "modify",
          changeCertainty: "definite",
        },
      ],
      denySettingsChange: {},
    };

    expect(stackWhatIfHasChanges(changes)).toBe(true);
  });

  it("returns true when the deny settings change", () => {
    const changes: DeploymentStacksWhatIfChange = {
      resourceChanges: [],
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
    };

    expect(stackWhatIfHasChanges(changes)).toBe(true);
  });

  it("returns true when the deployment scope changes", () => {
    const changes: DeploymentStacksWhatIfChange = {
      resourceChanges: [],
      denySettingsChange: {},
      deploymentScopeChange: {
        before: "/subscriptions/00000000-0000-0000-0000-000000000001",
        after:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1",
      },
    };

    expect(stackWhatIfHasChanges(changes)).toBe(true);
  });
});

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
          resourceConfigurationChanges: {
            after: { name: "bar" },
          },
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

    const result = formatDeploymentStacksWhatIfChange(changes, "debug");

    expect(result).toContain("Resource and property changes are indicated");
    expect(result).toContain("<GREEN>+<RESET> Create");
    expect(result).toContain("<YELLOW>*<RESET> Detach");
    expect(result).toContain("<MAGENTA>~<RESET> Modify");
    expect(result).toContain("The deployment stack settings will change:");
    expect(result).toContain("deploymentScope");
    expect(result).toContain(
      "/subscriptions/00000000-0000-0000-0000-000000000001 => /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1",
    );
    expect(result).toContain(
      "The deployment stack will update the following resources:",
    );
    expect(result).toContain("p2/bar");
    expect(result).toContain("p3/baz");
    expect(result).toContain("p1/foo1");
    expect(result).toContain(
      "Resource changes: 1 to create, 1 to detach, 1 to modify.",
    );
  });

  it("reports no change when there are no resource changes", () => {
    const changes: DeploymentStacksWhatIfChange = {
      resourceChanges: [],
      denySettingsChange: {},
    };

    const result = formatDeploymentStacksWhatIfChange(changes, "debug");

    expect(result).toContain("Resource changes: no change.");
  });
});
