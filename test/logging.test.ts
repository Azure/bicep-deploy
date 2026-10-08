// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as os from "os";

import { mockActionsCore } from "./mocks/actionCoreMocks";
import { ActionLogger } from "../src/logging";

const { randomUUIDMock } = vi.hoisted(() => ({
  randomUUIDMock: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  randomUUID: randomUUIDMock,
}));

const firstToken = "00000000-0000-4000-8000-000000000001";
const secondToken = "00000000-0000-4000-8000-000000000002";
const remoteInfo = { source: "remote", level: "info" } as const;

function getCommandToken(command: string): string {
  const match = command.match(/^::stop-commands::(.+)\r?\n$/);
  expect(match).not.toBeNull();
  return match![1];
}

describe("ActionLogger external output framing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActionsCore.info.mockImplementation(() => undefined);
    randomUUIDMock.mockReset();
    randomUUIDMock
      .mockReturnValueOnce(firstToken)
      .mockReturnValueOnce(secondToken);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("frames external output before rendering it", () => {
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const logger = new ActionLogger();
    const message = [
      "ordinary output",
      "::set-output name=externalValue::value",
      "  ::add-mask::secret",
      "::stop-commands::embedded-token",
    ].join("\n");

    logger.logExternalOutput(message, remoteInfo);

    expect(stdoutWrite).toHaveBeenCalledTimes(2);
    const token = getCommandToken(String(stdoutWrite.mock.calls[0][0]));
    expect(token).toBe(firstToken);
    expect(stdoutWrite.mock.calls[0][0]).toBe(
      `::stop-commands::${token}${os.EOL}`,
    );
    expect(stdoutWrite.mock.calls[1][0]).toBe(`::${token}::${os.EOL}`);
    expect(mockActionsCore.info).toHaveBeenCalledExactlyOnceWith(message);
    expect(stdoutWrite.mock.invocationCallOrder[0]).toBeLessThan(
      mockActionsCore.info.mock.invocationCallOrder[0],
    );
    expect(stdoutWrite.mock.invocationCallOrder[1]).toBeGreaterThan(
      mockActionsCore.info.mock.invocationCallOrder[0],
    );
  });

  it("uses a fresh framing token for every external message", () => {
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const logger = new ActionLogger();

    logger.logExternalOutput("first", remoteInfo);
    logger.logExternalOutput("second", remoteInfo);

    const firstToken = getCommandToken(String(stdoutWrite.mock.calls[0][0]));
    const secondToken = getCommandToken(String(stdoutWrite.mock.calls[2][0]));
    expect(firstToken).not.toBe(secondToken);
    expect(randomUUIDMock).toHaveBeenCalledTimes(2);
  });

  it("regenerates a framing token when its marker occurs in the payload", () => {
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const logger = new ActionLogger();
    const message = `external output\n::${firstToken}::\nmore output`;

    logger.logExternalOutput(message, remoteInfo);

    expect(randomUUIDMock).toHaveBeenCalledTimes(2);
    expect(stdoutWrite.mock.calls[0][0]).toBe(
      `::stop-commands::${secondToken}${os.EOL}`,
    );
    expect(stdoutWrite.mock.calls[1][0]).toBe(`::${secondToken}::${os.EOL}`);
  });

  it("does not render output when the opening frame fails", () => {
    const stopError = new Error("stop failed");
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementationOnce(() => {
        throw stopError;
      });
    const logger = new ActionLogger();

    expect(() =>
      logger.logExternalOutput("external output", remoteInfo),
    ).toThrow(stopError);

    expect(stdoutWrite).toHaveBeenCalledOnce();
    expect(mockActionsCore.info).not.toHaveBeenCalled();
  });

  it("closes the frame when rendering external output fails", () => {
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const logger = new ActionLogger();
    mockActionsCore.info.mockImplementationOnce(() => {
      throw new Error("write failed");
    });

    expect(() =>
      logger.logExternalOutput("external output", remoteInfo),
    ).toThrow("write failed");

    expect(stdoutWrite).toHaveBeenCalledTimes(2);
    const token = getCommandToken(String(stdoutWrite.mock.calls[0][0]));
    expect(stdoutWrite.mock.calls[1][0]).toBe(`::${token}::${os.EOL}`);
  });

  it("closes the frame before a subsequent trusted output", () => {
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const logger = new ActionLogger();

    logger.logExternalOutput(
      "::set-output name=externalValue::external-value",
      remoteInfo,
    );
    mockActionsCore.setOutput("trusted", "trusted-value");

    expect(stdoutWrite).toHaveBeenCalledTimes(2);
    expect(stdoutWrite.mock.invocationCallOrder[1]).toBeLessThan(
      mockActionsCore.setOutput.mock.invocationCallOrder[0],
    );
    expect(mockActionsCore.setOutput).toHaveBeenCalledWith(
      "trusted",
      "trusted-value",
    );
  });

  it.each([
    [
      "desired/new",
      'tags.reviewMarker: "before\n::warning::desired value\nafter"',
    ],
    [
      "existing/removed",
      'tags.reviewMarker: "before\n::error::existing value\nafter"',
    ],
  ])(
    "preserves the %s What-If payload as display text",
    (_scenario, message) => {
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const logger = new ActionLogger();

      logger.logExternalOutput(message, remoteInfo);

      expect(mockActionsCore.info).toHaveBeenCalledWith(message);
    },
  );

  it.each([
    ["info", "info"],
    ["debug", "debug"],
    ["warning", "warning"],
    ["error", "error"],
  ] as const)("preserves the %s external output level", (level, method) => {
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const logger = new ActionLogger();

    logger.logExternalOutput("external output", {
      source: "remote",
      level,
    });

    expect(mockActionsCore[method]).toHaveBeenCalledExactlyOnceWith(
      "external output",
    );
    expect(stdoutWrite).toHaveBeenCalledTimes(level === "info" ? 2 : 0);
  });
});
