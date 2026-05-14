# Versioning for `@azure/bicep-deploy-common`

The published version of this package is computed automatically by [Nerdbank.GitVersioning](https://github.com/dotnet/Nerdbank.GitVersioning) (NBGV) at publish time. **Do not edit the `"version"` field in [`package.json`](./package.json) by hand** — it is overwritten by the publish workflow.

## How it works

- [`version.json`](./version.json) declares the base version (e.g. `"0.0"`) and a `pathFilters` array scoping NBGV to this package's directory.
- On every run of the `Upload bicep-deploy-common Package` GitHub workflow (`.github/workflows/upload-package.yml`):
  1. The repo is checked out with full history (`fetch-depth: 0`).
  2. `npx -y --package=nerdbank-gitversioning -- nbgv-setversion` rewrites `package.json` to `<version>.<commitHeight + versionHeightOffset>`.
  3. The package is built, packed, and uploaded.
- `commitHeight` is the number of commits touching `packages/bicep-deploy-common/` since `version.json` was added. `pathFilters: ["."]` keeps changes elsewhere in the repo from incrementing this package's patch number.
- `publicReleaseRefSpec` ensures only publishes built from `main` produce a clean `X.Y.Z` — branch builds get a `-g<sha>` suffix.

The first publish under the current config (`version: "0.0"`, `versionHeightOffset: 6`) produces `0.0.7`, staying ahead of `0.0.6` which was the last hand-published version on npm.

## Bumping minor or major

NBGV resets the patch height whenever `version` changes. To bump:

| Change         | Edit `version.json`                                                                       | First published version |
| -------------- | ----------------------------------------------------------------------------------------- | ----------------------- |
| **Patch only** | _(no action — happens automatically on every publish)_                                    | next `0.0.x`            |
| **Minor**      | Set `"version": "0.1"`; remove `versionHeightOffset` if present                           | `0.1.1`                 |
| **Major**      | Set `"version": "1.0"`; remove `versionHeightOffset` if present                           | `1.0.1`                 |

### About `versionHeightOffset`

`versionHeightOffset` is **optional** and is only present when the patch counter for the current `X.Y` line needs to start ahead of a number that was already published (e.g. by an earlier hand-edited release). It exists in the current `version.json` solely to skip past `0.0.6` (the last hand-published version on npm).

**It is not a permanent part of the config.** When you bump to a new `X.Y` line, omit it entirely. Only add it back if a future bump collides with versions already on npm under the same `X.Y`.

## Local preview

To preview what version NBGV would stamp without modifying any files:

```pwsh
cd packages/bicep-deploy-common
npx -y --package=nerdbank-gitversioning -- nbgv get-version
```

The `NpmPackageVersion` line shows what the package would publish as.
