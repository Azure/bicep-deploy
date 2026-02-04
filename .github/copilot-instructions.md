# Bicep Deploy - Copilot Instructions

This repository contains the `bicep-deploy` GitHub Action and the shared `@azure/bicep-deploy-common` package.

## Pre-Commit Checklist

Before committing any changes, always run the following commands in order:

1. **Lint fix** - Fix any linting issues
   ```bash
   npm run lint -- --fix
   ```

2. **Build common package** - Build the shared common package
   ```bash
   cd packages/bicep-deploy-common && npm run build
   ```

3. **Build full repo** - Build the main action
   ```bash
   cd /path/to/bicep-deploy && npm run build
   ```

4. **Run all tests** - Ensure all tests pass
   ```bash
   npm test -- --run
   ```

All four steps must pass before committing.

## Repository Structure

- `src/` - GitHub Action source code
- `dist/` - Bundled output that GitHub Actions runs (must be committed!)
- `packages/bicep-deploy-common/` - Shared library used by both the GitHub Action and the Azure DevOps task
- `test/` - Tests for the GitHub Action
- `packages/bicep-deploy-common/test/` - Tests for the common package

**Important:** The `dist/` folder contains the compiled action code referenced by `action.yml` (`main: dist/index.cjs`). This folder must be rebuilt (`npm run build`) and committed whenever source code changes.

## Common Package

The `@azure/bicep-deploy-common` package is a shared library that provides:
- Azure deployment and deployment stack operations
- Bicep file compilation
- Configuration parsing
- Logging and error handling utilities

**Published Package:** https://www.npmjs.com/package/@azure/bicep-deploy-common

**Important:** The GitHub Action and ADO Task consume this package differently:
- **GitHub Action** (this repo): Uses the local file path (`packages/bicep-deploy-common/`), not the npm version
- **Azure DevOps Task** (`microsoft/azure-pipelines-tasks`): Uses the published npm version with a pinned version in `package.json` (e.g., `"@azure/bicep-deploy-common": "^0.0.3-dev"`)

When modifying the common package, remember that changes affect both:
- The GitHub Action (this repo) - immediately, via local reference
- The Azure DevOps BicepDeploy task - after publishing a new npm version and updating the version in the task's `package.json`

## Testing

- Unit tests use Vitest
- Run `npm test -- --run` for a single test run
- Run `npm test` for watch mode
- Run `npm run test:live` for live/integration tests (requires Azure credentials, tests in `test-live/` folder)
- Live tests are typically run by CI/CD workflows, not locally during development

## Adding New Logging Messages

When adding new logging to the common package:
1. Add the message template to `LoggingMessageConfig` interface in `src/loggingMessages.ts`
2. Add the default implementation to `defaultLoggingMessages`
3. This pattern allows consumers (GitHub Action, ADO Task) to customize/localize messages. In practice only the ADO Task does this.
4. For ADO Task localization, add message keys to the `messages` section in `task.json` - both `task.loc.json` and `resources.resjson` are auto-generated from `task.json` during build

## Adding New Error Messages

Error messages follow the same pattern as logging messages:
1. Add the message template to `ErrorMessageConfig` interface in `src/errorMessages.ts`
2. Add the default implementation to `defaultErrorMessages`
3. Consumers can customize error messages for localization

## Exporting New Functions

When adding new public functions or types to the common package:
1. Add exports to `packages/bicep-deploy-common/src/index.ts`
2. Rebuild the common package to regenerate type definitions

## Test File Structure

- Test mocks are in `packages/bicep-deploy-common/test/mocks/`
- Test fixtures/files are in `packages/bicep-deploy-common/test/files/`
- Use `TestLogger` from `test/logging.ts` for logging assertions in tests
- `TestLogger` provides `getInfoMessages()` and `clear()` methods for validating log output

