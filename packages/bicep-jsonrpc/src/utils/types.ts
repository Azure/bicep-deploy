export interface VersionRequest {}

export interface VersionResponse {
  version: string;
}

export interface GetDeploymentGraphRequest {
  path: string;
}

export interface GetDeploymentGraphResponse {
  nodes: GetDeploymentGraphResponseNode[];
  edges: GetDeploymentGraphResponseEdge[];
}

export interface GetDeploymentGraphResponseNode {
  range: Range;
  name: string;
  type: string;
  isExisting: boolean;
  relativePath?: string;
}

export interface GetDeploymentGraphResponseEdge {
  source: string;
  target: string;
}

export interface Position {
  line: number;
  char: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface CompileRequest {
  path: string;
}

export interface CompileResponse {
  success: boolean;
  diagnostics: CompileResponseDiagnostic[];
  contents?: string;
}

export interface CompileParamsRequest {
  path: string;
  parameterOverrides: Record<string, any>;
}

export interface CompileParamsResponse {
  success: boolean;
  diagnostics: CompileResponseDiagnostic[];
  parameters?: string;
  template?: string;
  templateSpecId?: string;
}

export interface CompileResponseDiagnostic {
  source: string;
  range: Range;
  level: 'Info' | 'Warning' | 'Error';
  code: string;
  message: string;
}

export interface GetMetadataRequest {
  path: string;
}

export interface GetMetadataResponse {
  metadata: MetadataDefinition[];
  parameters: SymbolDefinition[];
  outputs: SymbolDefinition[];
  exports: ExportDefinition[];
}

export interface MetadataDefinition {
  name: string;
  value: string;
}

export interface SymbolDefinition {
  range: Range;
  name: string;
  type?: TypeDescription;
  description?: string;
}

interface ExportDefinition {
  range: Range;
  name: string;
  kind: string;
  description?: string;
}

export interface TypeDescription {
  range?: Range;
  name: string;
}

export interface GetFileReferencesRequest {
  path: string;
}

export interface GetFileReferencesResponse {
  filePaths: string[];
}

export interface GetSnapshotRequest {
  path: string;
  metadata: GetSnapshotRequestMetadataDefinition;
  externalInputs?: GetSnapshotRequestExternalInputValue[];
}

export interface GetSnapshotRequestMetadataDefinition {
  tenantId?: string;
  subscriptionId?: string;
  resourceGroup?: string;
  location?: string;
  deploymentName?: string;
}

export interface GetSnapshotRequestExternalInputValue {
  kind: string;
  config?: any;
  value: any;
}

export interface GetSnapshotResponse {
  snapshot: string;
}

export interface FormatRequest {
  path: string;
}

export interface FormatResponse {
  contents: string;
}