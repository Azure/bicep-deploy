// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import os from "os";
import {
  MessageConnection,
} from "vscode-jsonrpc/node";
import { getBicepCliDownloadUrl, installBicepCliWithArch } from "./install";
import * as types from "./types";
import * as jsonrpc from "./jsonrpc";

/**
 * Helper class to install and interact with the Bicep CLI.
 */
export class Bicep {
  private constructor(private connection: MessageConnection) {}

  /**
   * Initializes the Bicep library with a connection to the Bicep CLI.
   *
   * @param bicepPath  The path to the Bicep CLI. You can point this to an existing install, or use `Bicep.install()` to obtain this path.
   * @returns          A `Bicep` instance.
   */
  static async initialize(bicepPath: string) {
    const connection = await jsonrpc.openConnection(bicepPath);
    const bicep = new Bicep(connection);

    try {
      const version = await bicep.version();
      const { success, minimumVersion } = jsonrpc.hasMinimumVersion(version, "0.25.3");
      if (!success) {
        throw new Error(`Bicep CLI version ${version} is not supported. Please install version ${minimumVersion} or later.`);
      }

      return bicep;
    } catch (e) {
      bicep.dispose();
      throw e;
    }
  }

  /**
   * Returns the Bicep CLI download URL.
   *
   * @param version   The version of the Bicep CLI to download. Defaults to the latest version.
   * @param platform  The platform to download for. Defaults to `os.platform()`.
   * @param arch      The architecture to download for. Defaults to `os.arch()`.
   * @returns         The download URL.
   */
  static async getDownloadUrl(
    version?: string,
    platform?: string,
    arch?: string): Promise<string> {

      platform ??= os.platform();
      arch ??= os.arch();

    return await getBicepCliDownloadUrl(platform, arch, version);
  }

  /**
   * Downloads the Bicep CLI to the specified path.
   *
   * @param basePath  The file system path to download the Bicep CLI to. This path must already exist.
   * @param version   The version of the Bicep CLI to download. Defaults to the latest version.
   * @param platform  The platform to download for. Defaults to `os.platform()`.
   * @param arch      The architecture to download for. Defaults to `os.arch()`.
   * @returns         The path to the Bicep CLI.
   */
  static async install(
    basePath: string,
    version?: string,
    platform?: string,
    arch?: string): Promise<string> {

    platform ??= os.platform();
    arch ??= os.arch();

    return await installBicepCliWithArch(basePath, platform, arch, version);
  }

  /**
   * Gets the version of the Bicep CLI.
   *
   * @returns        The version.
   */
  async version(): Promise<string> {
    const response = await this.connection.sendRequest(jsonrpc.versionRequestType, {});

    return response.version;
  }

  /**
   * Compiles a Bicep file.
   *
   * @param request  The compilation request.
   * @returns        The compilation response.
   */
  async compile(request: types.CompileRequest): Promise<types.CompileResponse> {
    return await this.connection.sendRequest(jsonrpc.compileRequestType, request);
  }

  /**
   * Compiles a Bicepparam file.
   *
   * @param request  The compilation request.
   * @returns        The compilation response.
   */
  async compileParams(request: types.CompileParamsRequest): Promise<types.CompileParamsResponse> {
    return await this.connection.sendRequest(jsonrpc.compileParamsRequestType, request);
  }

  /**
   * Returns metadata for a Bicep file.
   *
   * @param request  The getMetadata request.
   * @returns        The getMetadata response.
   */
  async getMetadata(request: types.GetMetadataRequest): Promise<types.GetMetadataResponse> {
    return await this.connection.sendRequest(jsonrpc.getMetadataRequestType, request);
  }

  /**
   * Returns the deployment graph for a Bicep file.
   *
   * @param request  The getDeploymentGraph request.
   * @returns        The getDeploymentGraph response.
   */
  async getDeploymentGraph(request: types.GetDeploymentGraphRequest): Promise<types.GetDeploymentGraphResponse> {
    return await this.connection.sendRequest(jsonrpc.getDeploymentGraphRequestType, request);
  }

  /**
   * Returns file references for a Bicep file.
   *
   * @param request  The getFileReferences request.
   * @returns        The getFileReferences response.
   */
  async getFileReferences(request: types.GetFileReferencesRequest): Promise<types.GetFileReferencesResponse> {
    return await this.connection.sendRequest(jsonrpc.getFileReferencesRequestType, request);
  }

  /**
   * Gets a snapshot of a Bicep parameters file.
   *
   * @param request  The getSnapshot request.
   * @returns        The getSnapshot response.
   */
  async getSnapshot(request: types.GetSnapshotRequest): Promise<types.GetSnapshotResponse> {
    if (!jsonrpc.hasMinimumVersion(await this.version(), "0.36.1").success) {
      throw new Error("Bicep CLI version 0.36.1 or later is required.");
    }
    return await this.connection.sendRequest(jsonrpc.getSnapshotRequestType, request);
  }

  /**
   * Formats a Bicep file.
   *
   * @param request  The format request.
   * @returns        The format response.
   */
  async format(request: types.FormatRequest): Promise<types.FormatResponse> {
    if (!jsonrpc.hasMinimumVersion(await this.version(), "0.37.0").success) {
      throw new Error("Bicep CLI version 0.37.0 or later is required.");
    }
    return await this.connection.sendRequest(jsonrpc.formatRequestType, request);
  }

  /**
   * Disposes of the connection to the Bicep CLI. This MUST be called after usage to avoid leaving the process running.
   */
  dispose() {
    this.connection.dispose();
  }
}