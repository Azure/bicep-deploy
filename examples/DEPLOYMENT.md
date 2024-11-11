# Deployment

This snippet showcases the default usage of the `azure/bicep-deploy@v1` action for creating an Azure deployment. It initiates a deployment named "Development" in the `westus2` region at the resource group scope. The deployment uses `main.bicep` as the template file and `main.bicepparam` for parameters, targeting a specific Azure resource group.

```yaml
- name: Sample
  uses: azure/bicep-deploy@v1
  with:
    type: deployment
    operation: create
    name: Development
    location: westus2
    scope: resourceGroup
    subscription-id: 00000000-0000-0000-0000-000000000000
    resource-group-name: example
    template-file: ./main.bicep
    parameters-file: ./main.bicepparam
```

This snippet demonstrates the default usage of the `azure/bicep-deploy@v1` action for creating an Azure deployment at the resource group level. It initiates a deployment named "Development" in the `westus2` region, targeting a specific resource group called "example." The deployment uses `main.bicep` as the template file, and the parameters are provided as a JSON object, specifying the resource name as "Development" and tagging it with the environment label "development." The configuration also targets a specific Azure resource group.

```yaml
- name: Deployment
  uses: azure/bicep-deploy@v1
  with:
    type: deployment
    operation: create
    name: Development
    location: westus2
    scope: resourceGroup
    subscription-id: 00000000-0000-0000-0000-000000000000
    resource-group-name: example
    template-file: ./src/main.bicep
    parameters: '{"name": "Development", "tags": { "environment": "development" }}'
```

**Create**

This workflow automates the deployment process by triggering on pushes to the main branch. It runs on an Ubuntu runner, checks out the repository, logs into Azure with federated credentials, and deploys using the specified ARM or Bicep templates and parameters, targeting a specific Azure resource group and location.

```yaml
name: Deployment (Create)

on:
  push:
    branches:
      - main

permissions:
  contents: read
  id-token: write

jobs:
  deployment:
    name: Deployment
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
          type: deployment
          operation: create
          name: Development
          scope: resourceGroup
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          resource-group-name: example
          template-file: ./main.bicep
          parameters-file: ./main.bicepparam
```

**Validate & What-If**

This workflow triggers on pull requests to the main branch. It runs on an Ubuntu runner, checks out the repository, logs into Azure with federated credentials, and performs both a "Validate" and a "What-If" operation using the specified ARM or Bicep templates and parameters, targeting a specific Azure resource group and location.

```yaml
name: Deployment (Validate)

on:
  pull_request:
    branches:
      - main

permissions:
  contents: read
  id-token: write

jobs:
  deployment:
    name: Validate
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
          type: deployment
          operation: validate
          name: Development
          location: westus2
          scope: resourceGroup
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          resource-group-name: example
          template-file: ./main.bicep
          parameters-file: ./main.bicepparam

      - name: What-If
        uses: azure/bicep-deploy@v1
        with:
          type: deployment
          operation: whatIf
          name: Development
          location: westus2
          scope: resourceGroup
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          resource-group-name: example
          template-file: ./main.bicep
          parameters-file: ./main.bicepparam
```
