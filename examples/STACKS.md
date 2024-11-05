# Deployment Stacks

This snippet demonstrates the default usage of the `azure/bicep-deploy@v1` GitHub Action to create a deployment stack. It deploys a "Development" environment in the `westus2` region at the subscription scope, using `main.bicep` as the template and `main.bicepparam` for parameters. The deployment also deletes untracked resources and resource groups as needed, applies deny settings to prevent write and delete actions, and includes a description for the stack.

```yaml
- name: Create
  uses: azure/bicep-deploy@v1
  with:
    type: deploymentStack
    operation: create
    name: Development
    location: westus2
    scope: subscription
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
    template-file: ./main.bicep
    parameters-file: ./main.bicepparam
    action-on-unmanage-resources: delete
    action-on-unmanage-resourcegroups: delete
    deny-settings-mode: denyWriteAndDelete
    description: "Development Environment"
```

This snippet illustrates the default usage of the `azure/bicep-deploy@v1` action to create a deployment stack, with an emphasis on the parameters input. It initiates a "Development" stack in the `westus2` region for a specific Azure subscription. The parameters are given as a JSON object, specifying the resource name as "Development" and tagging it as "development." The configuration also includes deletion policies for unmanaged resources and resource groups, applies deny settings to restrict write and delete actions, and includes a description for the environment being created.

```yaml
- name: Create
  uses: azure/bicep-deploy@v1
  with:
    type: deploymentStack
    operation: create
    name: Development
    location: westus2
    scope: subscription
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
    template-file: ./main.bicep
    parameters: '{"name": "Development", "tags": { "environment": "development" }}'
    action-on-unmanage-resources: delete
    action-on-unmanage-resourcegroups: delete
    deny-settings-mode: denyWriteAndDelete
    description: "Development Environment"
```

**Create**

This workflow triggers on every push to the main branch. It checks out the repository, logs into Azure, and deploys a "Development" stack in the `westus2` region using the provided template and parameters files. It also manages any untracked resources, applies deny policies, and adds a deployment description for clarity.

```yaml
name: Stacks (Create)

on:
  push:
    branches:
      - main

permissions:
  contents: read
  id-token: write

jobs:
  deployment:
    name: "Deployment Stack"
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Create
        uses: azure/bicep-deploy@v1
        with:
          type: deploymentStack
          operation: create
          name: Development
          location: westus2
          scope: subscription
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          template-file: ./main.bicep
          parameters-file: ./main.bicepparam
          action-on-unmanage-resources: delete
          action-on-unmanage-resourcegroups: delete
          deny-settings-mode: denyWriteAndDelete
          description: "Development Environment"
```

**Validate**

This workflow runs on pull requests to the main branch. It checks out the code, logs into Azure, and validates the "Development" deployment stack in the `westus2` region using the specified template and parameters files.

```yaml
name: Stacks (Validate)

on:
  pull_request:
    branches:
      - main

permissions:
  contents: read
  id-token: write

jobs:
  deployment:
    name: "Deployment Stack"
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Validate
        uses: azure/bicep-deploy@v1
        with:
          type: deploymentStack
          operation: validate
          name: Development
          location: westus2
          scope: subscription
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          template-file: ./main.bicep
          parameters-file: ./main.bicepparam
```

**Delete**

This workflow runs on manual dispatch. It checks out the code, logs into Azure, and deletes a "Development" deployment stack in the `westus2` region using the specified template and parameters files.

```yaml
name: Stacks (Delete)

on: workflow_dispatch

permissions:
  contents: read
  id-token: write

jobs:
  deployment:
    name: "Stacks"
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Delete
        uses: azure/bicep-deploy@v1
        with:
          type: deploymentStack
          operation: delete
          name: Development
          location: westus2
          scope: subscription
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          template-file: ./main.bicep
          parameters-file: ./main.bicepparam
```
