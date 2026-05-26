using 'main.bicep'

// Uppercase letters violate Microsoft.Storage/storageAccounts name rules
// (must be lowercase alphanumeric, 3-24 chars). This guarantees
// InvalidTemplateDeployment is returned by both deployments-validate and
// stacks-validate APIs (stacks-validate does not check global name
// uniqueness at validate-time, which 'foo' previously relied on).
param input = 'INVALIDNAME'
