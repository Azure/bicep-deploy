# Contributing

We are happy to accept code contributions via Pull Requests. We ask that you raise any proposed changes to the user experience (parameters, outputs) via a GitHub issue before submitting a PR to ensure the product team is aligned, and reduce the risk of your PR being rejected.

## Using this repo

After cloning this repo, you can use the following commands to build and run tests:

1. Install NPM dependencies
    ```bash
    npm ci
    ```
1. Build the project
    ```bash
    npm run build
    ```
1. Run tests
    ```bash
    npm test
    ```

## Versioning

The `@azure/bicep-deploy-common` package is versioned automatically by [Nerdbank.GitVersioning](https://github.com/dotnet/Nerdbank.GitVersioning) — **do not edit its `package.json` `version` field by hand**. See [`packages/bicep-deploy-common/VERSIONING.md`](./packages/bicep-deploy-common/VERSIONING.md) for how patch/minor/major bumps work.