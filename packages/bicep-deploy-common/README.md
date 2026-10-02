# Bicep Deploy Common

This package contains code that is commonly used between the bicep-deploy GitHub Action and Azure Pipelines Task.

## Usage

### Importing
Install this package and reference:
```typescript
import { Logger } from '@azure/bicep-deploy-common';
```

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