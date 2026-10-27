# Bicep Deploy Common

This package contains code that is commonly used between the bicep-deploy GitHub Action and Azure Pipelines Task.

## Usage

### Importing

Install this package and reference:

```typescript
import { Logger } from "@azure/bicep-deploy-common";
```

### Logging external output

`Logger` keeps task-owned messages separate from values that can be influenced
by Azure responses, repository content, or child processes. Implementations
must route `logExternalOutput` through the host runner's command-safe output
mechanism and preserve both the source and level:

```typescript
logger.logExternalOutput(message, {
  source: "remote",
  level: "warning",
});
```

The common package classifies output but does not apply runner-specific
escaping. Azure Pipelines and GitHub Actions adapters are responsible for
preventing external text from being interpreted as runner commands.

Azure SDK debug logging emits request and response metadata such as the method,
URL, status, correlation ID, and activity ID. It intentionally omits request
and response bodies because deployment payloads can contain parameters,
outputs, nested errors, and other sensitive values.

### ARM error handling

Deployment and deployment stack clients preserve structured ARM error responses,
including nested error details and correlation IDs, through a shared pipeline
policy. This applies to initial requests and long-running operation polling,
without changing the SDK's retry behavior or the initial deployment poll delay.
Responses without a structured ARM error remain subject to normal SDK handling.

## Validating the packed package

Run `npm run test:consumer` to build and pack the package, install the tarball
into a clean temporary fixture, and validate:

- published files and declaration entry points;
- root, `deployments`, and `stacks` imports at compile time and runtime; and
- the public subpath mocking behavior used by the Azure Pipelines task tests.

The command removes the generated tarball and temporary fixture after it
finishes.

The package-upload workflow uses `npm run pack:validate` after stamping and
building both shared packages. That command retains and reports the exact
validated tarballs so the workflow uploads the same files rather than repacking
after validation. The common tarball is stamped with an exact dependency on the
validated RPC tarball, while the workspace manifest is restored to its
development-time wildcard dependency after packing. Fixture installation uses
strict npm engine enforcement.

## Running unit tests

From this package directory, run `npm test` for Vitest watch mode or
`npm test -- --run` for a single run.

From the repository root, use the workspace command:

```sh
npm test --workspace @azure/bicep-deploy-common -- --run
```
