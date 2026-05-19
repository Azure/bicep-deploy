# Versioning for `@azure/bicep-deploy-common`

The published version of this package is computed automatically by [Nerdbank.GitVersioning](https://github.com/dotnet/Nerdbank.GitVersioning) (NBGV) at publish time. The `"version"` field in [`package.json`](./package.json) is intentionally set to the sentinel value `"0.0.0-placeholder"` — **do not edit it by hand**. It is overwritten by the publish workflow and restored after packaging.

This mirrors the pattern used by [`vscode-bicep`](https://github.com/Azure/bicep/blob/main/src/vscode-bicep/package.json).

## How it works

- [`version.json`](./version.json) declares the base version (e.g. `"0.1"`) and a `pathFilters` array scoping NBGV to this package's directory.
- `nerdbank-gitversioning` is declared as a devDependency so the `nbgv-setversion` binary is resolved from local `node_modules/.bin` (matching `vscode-bicep`).
- [`package.json`](./package.json) exposes two npm scripts that wrap NBGV:
  - `npm run stamp-version` (`nbgv-setversion`) — rewrites the `"version"` field to `<version>.<commitHeight>`.
  - `npm run reset-version` (`nbgv-setversion --reset`) — restores the `"0.0.0-placeholder"` sentinel.
- On every run of the `Upload bicep-deploy-common Package` GitHub workflow (`.github/workflows/upload-package.yml`):
  1. The repo is checked out with full history (`fetch-depth: 0`).
  2. `npm run stamp-version` stamps the real version.
  3. The package is built and packed (`npm pack`).
  4. `npm run reset-version` restores the placeholder so the working tree matches what's committed.
- `commitHeight` is the number of commits touching `packages/bicep-deploy-common/` since `version.json` was added. `pathFilters: ["."]` keeps changes elsewhere in the repo from incrementing this package's patch number.
- `publicReleaseRefSpec` ensures only publishes built from `main` produce a clean `X.Y.Z` — branch builds get a `-g<sha>` suffix.

### Why a placeholder version?

If someone bypasses the publish workflow and runs `npm publish` directly, npm will reject `0.0.0-placeholder` as a malformed/duplicate version instead of silently shipping a stale `X.Y.Z`. This makes accidental publishes loud rather than silent.

## Bumping minor or major

NBGV resets the patch height whenever `version` changes. To bump:

| Change         | Edit `version.json`         | First published version |
| -------------- | --------------------------- | ----------------------- |
| **Patch only** | _(no action — automatic)_   | next `0.1.x`            |
| **Minor**      | Set `"version": "0.2"`       | `0.2.1`                 |
| **Major**      | Set `"version": "1.0"`       | `1.0.1`                 |

## Local preview

To preview what version NBGV would stamp without modifying any files:

```pwsh
cd packages/bicep-deploy-common
npx nbgv get-version
```

The `NpmPackageVersion` line shows what the package would publish as.

To do a full local stamp → build → pack → reset cycle (useful for smoke-testing the tarball):

```pwsh
cd packages/bicep-deploy-common
npm run stamp-version
npm run build
npm pack
npm run reset-version
```

