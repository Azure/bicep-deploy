// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ActionLogger } from "../src/logging";

describe("ActionLogger external level commands", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["debug", "debug"],
    ["warning", "warning"],
    ["error", "error"],
  ] as const)(
    "emits %s output as an escaped workflow command without suspending commands",
    (level, command) => {
      const stdoutWrite = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true);
      const logger = new ActionLogger();
      const message =
        "first line\n::set-output name=externalValue::external-value";

      logger.logExternalOutput(message, { source: "remote", level });

      expect(stdoutWrite).toHaveBeenCalledOnce();
      const output = String(stdoutWrite.mock.calls[0][0]);
      expect(output).toBe(
        `::${command}::first line%0A::set-output name=externalValue::external-value${process.platform === "win32" ? "\r\n" : "\n"}`,
      );
      expect(output).not.toContain("::stop-commands::");
      expect(output.split(/\r?\n/)).toHaveLength(2);
    },
  );
});
