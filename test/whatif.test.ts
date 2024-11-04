// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { formatJson, formatWhatIfOperationResult } from "../src/helpers/whatif";
import { WhatIfChange } from "@azure/arm-resources";

describe("formatJson tests", () => {
  it("test_leaf", () => {
    const testData = [
      ["null", null],
      ["true", true],
      ["false", false],
      ["42", 42],
      ["42.12345", 42.12345],
      ['"foo"', "foo"],
      ["{}", {}],
      ["[]", []],
    ];

    testData.forEach(([expected, value]) => {
      expect(formatJson(value, "debug")).toStrictEqual(expected);
    });
  });

  it("test_non_empty_array", () => {
    const value = Array.from({ length: 11 }, (_, i) => i);
    const expected = `<RESET>[<RESET>
  0<RESET>:<RESET>  0
  1<RESET>:<RESET>  1
  2<RESET>:<RESET>  2
  3<RESET>:<RESET>  3
  4<RESET>:<RESET>  4
  5<RESET>:<RESET>  5
  6<RESET>:<RESET>  6
  7<RESET>:<RESET>  7
  8<RESET>:<RESET>  8
  9<RESET>:<RESET>  9
  10<RESET>:<RESET> 10
<RESET>]<RESET>`;

    expect(formatJson(value, "debug")).toStrictEqual(expected);
  });

  it("test_non_empty_object", () => {
    const value = {
      path: { to: { foo: "foo" } },
      longPath: { to: { bar: "bar" } },
    };
    const expected = `

  path.to.foo<RESET>:<RESET>     "foo"
  longPath.to.bar<RESET>:<RESET> "bar"
`;

    expect(formatJson(value, "debug")).toStrictEqual(expected);
  });

  it("test_complex_value", () => {
    const value = {
      root: {
        foo: 1234,
        bar: [
          true,
          null,
          { nestedString: "value", nestedArray: [92747, "test"] },
          [false],
        ],
        foobar: "foobar",
      },
    };

    const expected = `

  root.foo<RESET>:<RESET>    1234
  root.bar<RESET>:<RESET> <RESET>[<RESET>
    0<RESET>:<RESET> true
    1<RESET>:<RESET> null
    2<RESET>:<RESET>

      nestedString<RESET>:<RESET> "value"
      nestedArray<RESET>:<RESET> <RESET>[<RESET>
        0<RESET>:<RESET> 92747
        1<RESET>:<RESET> "test"
      <RESET>]<RESET>
    3<RESET>:<RESET>

      0<RESET>:<RESET> false

  <RESET>]<RESET>  root.foobar<RESET>:<RESET> "foobar"
`;

    expect(formatJson(value, "debug")).toStrictEqual(expected);
  });
});

describe("testFormatWhatIfOperationResult", () => {
  it("test_change_type_legend", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo1",
        changeType: "Modify",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p2/bar",
        changeType: "Create",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg2/providers/p1/foo2",
        changeType: "Modify",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/providers/p3/foobar1",
        changeType: "Ignore",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg3",
        changeType: "Modify",
        delta: [
          {
            path: "path.to.array.change",
            propertyChangeType: "Array",
            children: [
              {
                path: "1",
                propertyChangeType: "Delete",
              },
            ],
          },
        ],
      },
    ];

    const expected = `Note: The result may contain false positive predictions (noise).
You can help us improve the accuracy of the result by opening an issue here: https://aka.ms/WhatIfIssues

Resource and property changes are indicated with these symbols:
  <RED>-<RESET> Delete
  <GREEN>+<RESET> Create
  <MAGENTA>~<RESET> Modify
  <WHITE>*<RESET> Ignore

The deployment will update the following scopes:

Scope: /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1
<GREEN>
  + p2/bar<RESET><MAGENTA>
  ~ p1/foo1
<RESET>
Scope: /subscriptions/00000000-0000-0000-0000-000000000002
<MAGENTA>
  ~ resourceGroups/rg3<RESET>
    <MAGENTA>~<RESET> path.to.array.change<RESET>:<RESET> [
      <RED>-<RESET> 1<RESET>:<RESET> <RED>undefined<RESET>
      ]
<MAGENTA><RESET><WHITE>
  * p3/foobar1
<RESET>
Scope: /subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg2
<MAGENTA>
  ~ p1/foo2
<RESET>
Resource changes: 1 to create, 3 to modify, 1 to ignore.`;

    expect(formatWhatIfOperationResult({ changes }, "debug")).toBe(expected);
  });

  it("test_resource_changes_stats", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo1",
        changeType: "Create",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p2/bar",
        changeType: "Create",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg2/providers/p1/foo2",
        changeType: "Modify",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/providers/p3/foobar1",
        changeType: "Ignore",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg3",
        changeType: "Delete",
      },
    ];

    const expected =
      "\nResource changes: 1 to delete, 2 to create, 1 to modify, 1 to ignore.";
    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(result.endsWith(expected)).toBeTruthy();
  });

  it("test_group_resources_changes_by_sorted_scope", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/RG1/providers/p1/foo1",
        changeType: "Create",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p2/bar",
        changeType: "Create",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg2/providers/p1/foo2",
        changeType: "Modify",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/providers/p3/foobar1",
        changeType: "Ignore",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/providers/p3/foobar2",
        changeType: "Delete",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg3",
        changeType: "Delete",
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/RG1
<GREEN>
  + p1/foo1
  + p2/bar
<RESET>
Scope: /subscriptions/00000000-0000-0000-0000-000000000002
<RED>
  - p3/foobar2
  - resourceGroups/rg3<RESET><WHITE>
  * p3/foobar1
<RESET>
Scope: /subscriptions/00000000-0000-0000-0000-000000000002/resourceGroups/rg2
<MAGENTA>
  ~ p1/foo2
<RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(result).toContain(expected);
  });

  it("should sort resource IDs within a scope", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo",
        changeType: "Ignore",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p2/foo",
        changeType: "Create",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p3/foo",
        changeType: "NoChange",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p4/foo",
        changeType: "Deploy",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p5/foo",
        changeType: "Delete",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p6/foo",
        changeType: "Delete",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p7/foo",
        changeType: "Delete",
      },
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p8/foo",
        changeType: "Unsupported",
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1
<RED>
  - p5/foo
  - p6/foo
  - p7/foo<RESET><GREEN>
  + p2/foo<RESET><BLUE>
  ! p4/foo<RESET><RESET>
  = p3/foo<RESET><WHITE>
  x p8/foo<RESET><WHITE>
  * p1/foo
<RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(result).toContain(expected);
  });

  it("should handle property create changes", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo",
        changeType: "Create",
        after: {
          numberValue: 1.2,
          booleanValue: true,
          stringValue: "The quick brown fox jumps over the lazy dog.",
        },
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1
<GREEN>
  + p1/foo

      numberValue<RESET>:<GREEN>  1.2
      booleanValue<RESET>:<GREEN> true
      stringValue<RESET>:<GREEN>  "The quick brown fox jumps over the lazy dog."
<RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(result).toContain(expected);
  });

  it("should handle property delete changes", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo",
        changeType: "Delete",
        before: {
          apiVersion: "2020-04-01",
          numberValue: 1.2,
          booleanValue: true,
          stringValue: "The quick brown fox jumps over the lazy dog.",
        },
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1
<RED>
  - p1/foo<RESET> [2020-04-01]<RED>

      apiVersion<RESET>:<RED>   "2020-04-01"
      numberValue<RESET>:<RED>  1.2
      booleanValue<RESET>:<RED> true
      stringValue<RESET>:<RED>  "The quick brown fox jumps over the lazy dog."
<RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(result).toContain(expected);
  });

  it("should handle property modify changes", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo",
        changeType: "Modify",
        delta: [
          {
            path: "path.a.to.change",
            propertyChangeType: "Modify",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            before: "foo" as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            after: "bar" as any,
          },
          {
            path: "path.a.to.change2",
            propertyChangeType: "Modify",
            before: { tag1: "value" },
            after: { tag2: "value" },
          },
          {
            path: "path.a.to.change3",
            propertyChangeType: "NoEffect",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            after: 12345 as any,
          },
          {
            path: "path.b.to.nested.change",
            propertyChangeType: "Array",
            children: [
              {
                path: "4",
                propertyChangeType: "Modify",
                children: [
                  {
                    path: "foo.bar",
                    propertyChangeType: "Modify",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    before: true as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    after: false as any,
                  },
                  {
                    path: "baz",
                    propertyChangeType: "Create",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    after: ["element1", "element2"] as any,
                  },
                ],
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { path: "5", propertyChangeType: "Delete", before: 12345 as any },
            ],
          },
        ],
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1
<MAGENTA>
  ~ p1/foo<RESET>
    <MAGENTA>~<RESET> path.a.to.change<RESET>:<RESET>  <RED>"foo"<RESET> => <GREEN>"bar"<RESET>
    <MAGENTA>~<RESET> path.a.to.change2<RESET>:<RESET><RED>

        tag1<RESET>:<RED> "value"
<RESET>
      =><GREEN>

        tag2<RESET>:<GREEN> "value"
<RESET>
    <MAGENTA>~<RESET> path.b.to.nested.change<RESET>:<RESET> [
      <RED>-<RESET> 5<RESET>:<RESET> <RED>12345<RESET>
      <MAGENTA>~<RESET> 4<RESET>:<RESET>

        <GREEN>+<RESET> baz<RESET>:<RESET> <GREEN><RESET>[<GREEN>
            0<RESET>:<GREEN> "element1"
            1<RESET>:<GREEN> "element2"
          <RESET>]<GREEN><RESET>
        <MAGENTA>~<RESET> foo.bar<RESET>:<RESET> <RED>true<RESET> => <GREEN>false<RESET>

      ]
    <WHITE>x<RESET> path.a.to.change3<RESET>:<RESET> <WHITE>12345<RESET>
<MAGENTA><RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(result).toContain(expected);
  });

  it("test_json_alignment", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo",
        changeType: "Delete",
        before: {
          apiVersion: "2020-04-01",
          numberValue: 1.2,
          booleanValue: true,
          stringValue: "The quick brown fox jumps over the lazy dog.",
          emptyArray: [],
          emptyObject: {},
          arrayContaingValues: ["foo", "bar"],
        },
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1
<RED>
  - p1/foo<RESET> [2020-04-01]<RED>

      apiVersion<RESET>:<RED>   "2020-04-01"
      numberValue<RESET>:<RED>  1.2
      booleanValue<RESET>:<RED> true
      stringValue<RESET>:<RED>  "The quick brown fox jumps over the lazy dog."
      emptyArray<RESET>:<RED>   []
      emptyObject<RESET>:<RED>  {}
      arrayContaingValues<RESET>:<RED> <RESET>[<RED>
        0<RESET>:<RED> "foo"
        1<RESET>:<RED> "bar"
      <RESET>]<RED><RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(result).toContain(expected);
  });

  it("test_property_changes_alignment", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1/providers/p1/foo",
        changeType: "Modify",
        delta: [
          {
            path: "path",
            propertyChangeType: "Delete",
            before: {},
          },
          {
            path: "long.path",
            propertyChangeType: "Create",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            after: [] as any,
          },
          {
            path: "long.nested.path",
            propertyChangeType: "Array",
            children: [
              {
                path: "5",
                propertyChangeType: "Delete",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                before: 12345 as any,
              },
            ],
          },
        ],
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg1
<MAGENTA>
  ~ p1/foo<RESET>
    <RED>-<RESET> path<RESET>:<RESET>      <RED>{}<RESET>
    <GREEN>+<RESET> long.path<RESET>:<RESET> <GREEN>[]<RESET>
    <MAGENTA>~<RESET> long.nested.path<RESET>:<RESET> [
      <RED>-<RESET> 5<RESET>:<RESET> <RED>12345<RESET>
      ]
<MAGENTA><RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(result).toContain(expected);
  });

  it("test_nested_array_changes", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000004/resourceGroups/rg4/providers/Microsoft.DocumentDB/databaseAccounts/myaccount/sqlDatabases/accesscontrol/containers/workflows",
        changeType: "Modify",
        delta: [
          {
            path: "properties.resource.indexingPolicy.compositeIndexes",
            propertyChangeType: "Array",
            children: [
              {
                path: "0",
                propertyChangeType: "Modify",
                children: [
                  {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    path: null as any,
                    propertyChangeType: "Array",
                    children: [
                      {
                        path: "0",
                        propertyChangeType: "Modify",
                        children: [
                          {
                            path: "order",
                            propertyChangeType: "Delete",
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            before: "ascending" as any,
                          },
                        ],
                      },
                      {
                        path: "1",
                        propertyChangeType: "Modify",
                        children: [
                          {
                            path: "order",
                            propertyChangeType: "Delete",
                            before: "ascending",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000004/resourceGroups/rg4
<MAGENTA>
  ~ Microsoft.DocumentDB/databaseAccounts/myaccount/sqlDatabases/accesscontrol/containers/workflows<RESET>
    <MAGENTA>~<RESET> properties.resource.indexingPolicy.compositeIndexes<RESET>:<RESET> [
      <MAGENTA>~<RESET> 0<RESET>:<RESET>

        [
        <MAGENTA>~<RESET> 0<RESET>:<RESET>

          <RED>-<RESET> order<RESET>:<RESET> <RED>"ascending"<RESET>

        <MAGENTA>~<RESET> 1<RESET>:<RESET>

          <RED>-<RESET> order<RESET>:<RESET> <RED>"ascending"<RESET>

        ]

      ]
<MAGENTA><RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(
      result
        .split("\n")
        .map(x => x.trimEnd())
        .join("\n"),
    ).toContain(expected);
  });

  it("fixes up a dodgy SDK response", () => {
    const changes: WhatIfChange[] = [
      {
        resourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000004/resourceGroups/rg4/providers/Microsoft.DocumentDB/databaseAccounts/myaccount",
        changeType: "Modify",
        delta: [
          {
            propertyChangeType: "Modify",
            path: "properties.why",
            before: {
              0: "y",
              1: " ",
              2: "u",
              3: " ",
              4: "d",
              5: "o",
              6: " ",
              7: "d",
              8: "i",
              9: "s",
              10: "?",
            },
            after: {
              0: "i",
              1: "d",
              2: "k",
              3: ",",
              4: " ",
              5: "l",
              6: "o",
              7: "l",
            },
          },
        ],
      },
    ];

    const expected = `
Scope: /subscriptions/00000000-0000-0000-0000-000000000004/resourceGroups/rg4
<MAGENTA>
  ~ Microsoft.DocumentDB/databaseAccounts/myaccount<RESET>
    <MAGENTA>~<RESET> properties.why<RESET>:<RESET><RED>"y u do dis?"<RESET> => <GREEN>"idk, lol"<RESET>
<MAGENTA><RESET>
`;

    const result = formatWhatIfOperationResult({ changes }, "debug");

    expect(
      result
        .split("\n")
        .map(x => x.trimEnd())
        .join("\n"),
    ).toContain(expected);
  });
});
