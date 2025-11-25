// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as main from "../src/main";

// Mock the action's entrypoint
const runMock = vi.spyOn(main, "run").mockImplementation(vi.fn());

describe("index", () => {
  it("calls run when imported", async () => {
    await import("../src/index");

    expect(runMock).toHaveBeenCalled();
  });
});
