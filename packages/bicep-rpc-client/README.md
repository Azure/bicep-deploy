# Azure Bicep RPC Client

A Node.js library for programmatically interacting with the [Bicep CLI](https://github.com/Azure/bicep) via JSON-RPC.

## Getting started

### Install the package

```bash
npm install @azure/bicep-rpc-client
```

### Initialize the client

`Bicep.install()` downloads the Bicep CLI (if needed) and returns its path. By default, pass a directory such as `os.tmpdir()` or `~/.bicep` as the base path. Then call `Bicep.initialize()` to open a JSON-RPC connection.

```typescript
import os from 'os';
import { Bicep } from '@azure/bicep-rpc-client';

const bicepPath = await Bicep.install(os.tmpdir());
const bicep = await Bicep.initialize(bicepPath);

// ... use bicep ...

bicep.dispose();
```

### Pin a specific Bicep version

```typescript
const bicepPath = await Bicep.install(os.tmpdir(), '0.38.5');
```

### Use an existing Bicep installation

```typescript
const bicep = await Bicep.initialize('/usr/local/bin/bicep');
```

## Available operations

All methods are async and communicate with the Bicep CLI over JSON-RPC. Call `bicep.dispose()` when finished to close the connection.

### compile

Compiles a `.bicep` file into an ARM template JSON string.

```typescript
const result = await bicep.compile({ path: './main.bicep' });

if (result.success) {
  // result.contents contains the ARM template JSON
  console.log(result.contents);
}
```

### compileParams

Compiles a `.bicepparam` file into ARM deployment parameters. You can optionally override parameter values.

```typescript
const result = await bicep.compileParams({
  path: './main.bicepparam',
  parameterOverrides: {},
});

if (result.success) {
  console.log(result.parameters); // ARM parameters JSON
  console.log(result.template);   // ARM template JSON (if resolvable)
  // result.templateSpecId is set when the params file references a template spec
}
```

### format

Formats a Bicep file according to the standard Bicep formatting rules. Requires Bicep CLI **0.37.0** or later.

```typescript
const result = await bicep.format({ path: './main.bicep' });

fs.writeFileSync('./main.bicep', result.contents);
```

### getMetadata

Retrieves parameters, outputs, exports, and file-level metadata from a Bicep file.

```typescript
const result = await bicep.getMetadata({ path: './main.bicep' });

for (const param of result.parameters) {
  console.log(`param ${param.name}: ${param.type?.name} — ${param.description}`);
}

for (const output of result.outputs) {
  console.log(`output ${output.name}: ${output.type?.name}`);
}

for (const exp of result.exports) {
  console.log(`@export() ${exp.kind} ${exp.name}`);
}

for (const meta of result.metadata) {
  console.log(`metadata ${meta.name} = '${meta.value}'`);
}
```

### getFileReferences

Returns all file paths referenced by a Bicep file — modules, loaded files, and the file itself.

```typescript
const result = await bicep.getFileReferences({ path: './main.bicep' });

for (const filePath of result.filePaths) {
  console.log(filePath);
}
```

### getDeploymentGraph

Returns the resource dependency graph for a Bicep file, useful for visualization.

```typescript
const result = await bicep.getDeploymentGraph({ path: './main.bicep' });

for (const node of result.nodes) {
  const existing = node.isExisting ? ' (existing)' : '';
  console.log(`  ${node.name}: ${node.type}${existing}`);
}

for (const edge of result.edges) {
  console.log(`  ${edge.source} -> ${edge.target}`);
}
```

### getSnapshot

Generates a snapshot of a `.bicepparam` file with Azure deployment context. Requires Bicep CLI **0.36.1** or later.

```typescript
const result = await bicep.getSnapshot({
  path: './main.bicepparam',
  metadata: {
    tenantId: undefined,
    subscriptionId: '00000000-0000-0000-0000-000000000000',
    resourceGroup: 'my-rg',
    location: 'eastus',
    deploymentName: 'my-deployment',
  },
  externalInputs: undefined,
});

console.log(result.snapshot);
```

### version

Returns the version of the connected Bicep CLI.

```typescript
const ver = await bicep.version();
console.log(`Bicep CLI version: ${ver}`);
```