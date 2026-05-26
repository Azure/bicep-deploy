// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import path from "path";
import os from "os";
import { spawn, spawnSync, ChildProcess } from "child_process";
import { randomBytes } from "crypto";
import { createServer } from "net";
import {
  RequestType,
  createMessageConnection,
  MessageReader,
  MessageWriter,
  SocketMessageReader,
  SocketMessageWriter,
} from "vscode-jsonrpc/node";
import * as types from "./types";

export const versionRequestType = new RequestType<
  types.VersionRequest,
  types.VersionResponse,
  never
>("bicep/version");

export const compileRequestType = new RequestType<
  types.CompileRequest,
  types.CompileResponse,
  never
>("bicep/compile");

export const compileParamsRequestType = new RequestType<
  types.CompileParamsRequest,
  types.CompileParamsResponse,
  never
>("bicep/compileParams");

export const getMetadataRequestType = new RequestType<
  types.GetMetadataRequest,
  types.GetMetadataResponse,
  never
>("bicep/getMetadata");

export const getDeploymentGraphRequestType = new RequestType<
  types.GetDeploymentGraphRequest,
  types.GetDeploymentGraphResponse,
  never
>("bicep/getDeploymentGraph");

export const getFileReferencesRequestType = new RequestType<
  types.GetFileReferencesRequest,
  types.GetFileReferencesResponse,
  never
>("bicep/getFileReferences");

export const getSnapshotRequestType = new RequestType<
  types.GetSnapshotRequest,
  types.GetSnapshotResponse,
  never
>("bicep/getSnapshot");

export const formatRequestType = new RequestType<
  types.FormatRequest,
  types.FormatResponse,
  never
>("bicep/format");

export function hasMinimumVersion(actualVersion: string, minimumVersion: string) {
  const compareResult = actualVersion.localeCompare(minimumVersion, undefined, { numeric: true, sensitivity: 'base' });

  return {
    success: compareResult >= 0,
    minimumVersion
  };
}

function tryGetVersionNumberError(bicepPath: string) {
  const result = spawnSync(bicepPath, ["--version"], { encoding: "utf-8" });
  if (result.status !== 0) {
    return `Failed to obtain valid Bicep version from '${bicepPath} --version'`;
  }

  const versionMatch = result.stdout.match(/Bicep CLI version ([^ ]+) /);
  if (!versionMatch) {
    return `Failed to obtain valid Bicep version from '${bicepPath} --version'`;
  }

  const actualVersion = versionMatch[1];
  const { success, minimumVersion } = hasMinimumVersion(actualVersion, "0.25.3");
  if (!success) {
    return `A minimum Bicep version of ${minimumVersion} is required. Detected version ${actualVersion} from '${bicepPath} --version'`;
  }

  return;
}

function generateRandomPipeName(): string {
  const randomSuffix = randomBytes(21).toString("hex");
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\bicep-${randomSuffix}-sock`;
  }

  return path.join(os.tmpdir(), `bicep-${randomSuffix}.sock`);
}

function connectClientPipe(pipeName: string, process: ChildProcess): Promise<[MessageReader, MessageWriter]> {
  return new Promise<[MessageReader, MessageWriter]>((resolve, reject) => {
    const handleConnectionError = () => {
      server.close();
      reject();
    };

    const server = createServer(socket => {
      process.removeListener('exit', handleConnectionError)
      server.close();
      resolve([
        new SocketMessageReader(socket, 'utf-8'),
        new SocketMessageWriter(socket, 'utf-8')
      ]);
    });

    process.on('exit', handleConnectionError);
    process.on('error', handleConnectionError);
    server.on('error', handleConnectionError);
    server.listen(pipeName, () => server.removeListener('error', handleConnectionError));
  });
}

export async function openConnection(bicepPath: string) {
  const pipePath = generateRandomPipeName();

  const process = spawn(bicepPath, ["jsonrpc", "--pipe", pipePath]);
  let stderr = '';
  process.stderr.on("data", (x) => stderr += x.toString());
  const processExitedEarly = new Promise<void>((_, reject) => {
    process.on("error", (err) => {
      reject(`Failed to invoke '${bicepPath} jsonrpc'. Error: ${err}`);
    });
    process.on("exit", () => {
      const error = tryGetVersionNumberError(bicepPath);
      if (error) {
        reject(error);
      } else {
        reject(`Failed to invoke '${bicepPath} jsonrpc'. Error: ${stderr}`);
      }
    });
  });

  const transportConnected = connectClientPipe(pipePath, process);

  const result = await Promise.race([
    transportConnected,
    processExitedEarly,
  ]);

  const [reader, writer] = result!;
  const connection = createMessageConnection(reader, writer, console);
  connection.onDispose(() => process.kill());
  process.on("exit", () => connection.dispose());

  connection.listen();
  return connection;
}