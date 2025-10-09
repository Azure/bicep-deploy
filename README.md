# Azure Deployment Action

This repository offers a GitHub Action for automating the deployment and management of Azure resources using ARM Templates or Bicep files. It integrates smoothly into GitHub workflows, allowing developers to manage Azure infrastructure directly within their CI/CD pipelines.

With this action, users can:

- Deploy resources via Azure Deployments or manage environments using Deployment Stacks.
- Perform various operations like creating, validating, and previewing resource changes using the "What If" feature.

**Key Configuration Options**

- **Execution Type (`type`)**: Specifies the mode of execution, whether deploying individual resources (`deployment`) or managing full environment stacks (`deploymentStack`).
- **Operations (`operation`)**: Users can create, validate, or preview changes before deploying resources. For deployment stacks, deletion and lifecycle management are also supported.
- **Scope (`scope`)**: Defines the scope at which resources are deployed, such as tenant, management group, subscription, or resource group.
- **Template & Parameters**: Paths to the ARM or Bicep templates (`template-file`) and associated parameter files (`parameters-file`).
- **What If Analysis**: Leverage the what-if operation to preview potential changes before applying them, including options to exclude certain change types (`what-if-exclude-change-type`).
- **Unmanaged Resource Actions**: Specify actions to take on unmanaged resources (`action-on-unmanage-resources`) or entire resource groups (`action-on-unmanage-resourcegroups`), such as deleting or detaching them.

This action simplifies Azure resource management, providing flexibility through various configurations, making it suitable for automating both simple and complex infrastructure scenarios.

## Usage

### Deployment

```yaml
- name: Deployment
  uses: azure/bicep-deploy@v2
  with:
    type: deployment
    operation: create
    name: Development
    location: westus2
    scope: subscription
    subscription-id: 00000000-0000-0000-0000-000000000000
    template-file: ./main.bicep
    parameters-file: ./main.bicepparam
```

See more examples in [examples/DEPLOYMENT.md](./examples/DEPLOYMENT.md).

### Deployment Stack

```yaml
- name: Deployment
  uses: azure/bicep-deploy@v2
  with:
    type: deploymentStack
    operation: create
    name: Development
    location: westus2
    scope: subscription
    subscription-id: 00000000-0000-0000-0000-000000000000
    template-file: ./main.bicep
    parameters-file: ./main.bicepparam
    action-on-unmanage-resources: delete
    action-on-unmanage-resourcegroups: delete
    deny-settings-mode: denyWriteAndDelete
```

See more examples in [examples/STACKS.md](./examples/STACKS.md).

## Dependencies

- [Login](https://github.com/azure/login): This action is used to authenticate
  the GitHub Actions workflow with Azure Resource Manager (ARM).
- [Checkout](https://github.com/actions/checkout): This action checks out the
  repository where the workflow is running onto the GitHub Actions runner.

## Inputs

The inputs for this action provide flexibility and control for managing deployment operations and resources in Azure. By combining inputs like `type`, `operation`, and `scope`, workflows can be configured to handle a variety of scenarios, from deploying individual resources to managing comprehensive deployment stacks. Inputs such as template-file, parameters-file, and tags allow for easy customization of deployment configurations and metadata. Advanced features, including `actions-on-unmanaged-resources` and "What If" analysis, ensure deployments are predictable and secure. These options make it simple to integrate Azure resource management into CI/CD workflows.

| Name                                  | Description                                                                                                   | Allowed Values                                                                                                                                   | Required |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `type`                                | Specifies the execution type, which can be either 'deployment' or 'deploymentStack'.                                                              | `deployment`, `deploymentStack`                                                                                                                  | Yes      |
| `operation`                           | Specifies the operation to perform. For deployment, choose from 'create', 'validate', 'whatIf'. For deploymentStack, choose from 'create', 'delete', 'validate'. | deployment: `create`, `validate`, `whatIf` <br> deploymentStack: `create`, `delete`, `validate`                                                  | Yes      |
| `scope`                               | Specifies the scope of the deployment or deploymentStack. For deployment, choose from 'resourceGroup', 'subscription', 'managementGroup', 'tenant'. For deploymentStack, choose from 'resourceGroup', 'subscription', 'managementGroup'. | deployment: `tenant`, `managementGroup`, `subscription`, `resourceGroup` <br> deploymentStack: `managementGroup`, `subscription`,`resourceGroup` | Yes      |
| `name`                                | Specifies the name of the deployment or deploymentStack.                                                      | Free-text                                                                                                                                        | No       |
| `location`                            | Specifies the location of the deployment or deploymentStack. Must be provided if the 'scope' parameter is 'subscription', 'managementGroup' or 'tenant'. | Free-text                                                                                                                                        | No       |
| `tenant-id`                           | Specifies the tenant ID. Required if the 'scope' parameter is 'tenant'.                                       | Free-text                                                                                                                                        | No       |
| `management-group-id`                 | Specifies the management group ID. Required if the 'scope' parameter is 'managementGroup'.                    | Free-text                                                                                                                                        | No       |
| `subscription-id`                     | Specifies the subscription ID. Required if the 'scope' parameter is 'subscription' or 'resourceGroup'.        | Free-text                                                                                                                                        | No       |
| `resource-group-name`                 | Specifies the resource group name. Required if the 'scope' parameter is 'resourceGroup'.                      | Free-text                                                                                                                                        | No       |
| `template-file`                       | Specifies the path to the template file.                                                                      | Free-text                                                                                                                                        | No       |
| `parameters-file`                     | Specifies the path to the parameters file (.json or .bicepparam).                                             | Free-text                                                                                                                                        | No       |
| `parameters`                          | Specifies the inline parameters to use (as json object).                                                      | Free-text                                                                                                                                        | No       |
| `bicep-version`                       | Specifies the version of Bicep to use for compilation. If not provided, the latest version will be used.      | Free-text                                                                                                                                        | No       |
| `masked-outputs`                      | Specifies output names to mask values for.                                                                    | Free-text                                                                                                                                        | No       |
| `environment`                         | Specifies the Azure environment to use. Choose from 'azureCloud', 'azureChinaCloud', 'azureGermanCloud', 'azureUSGovernment'. | Free-text                                                                                                                                        | No       |
| `what-if-exclude-change-types`        | Specifies the change types to exclude from the 'What If' operation.                                           | Free-text                                                                                                                                        | No       |
| `validation-level`                    | Specifies the validation level. Only supported for deployment what-if and validate operations. Choose from 'provider', 'template', or 'providerNoRbac'. | Free-text                                                                                                                                        | No       |
| `action-on-unmanage-resources`        | Specifies the action to take on unmanaged resources. Choose from 'delete' or 'detach'.                        | `delete`, `detach`                                                                                                                               | No       |
| `action-on-unmanage-resourcegroups`   | Specifies the action to take on unmanaged resource groups. Choose from 'delete' or 'detach'.                  | `delete`, `detach`                                                                                                                               | No       |
| `action-on-unmanage-managementgroup`  | Specifies the action to take on unmanaged management groups. Choose from 'delete' or 'detach'.                | `delete`, `detach`                                                                                                                               | No       |
| `deny-settings-mode`                  | Specifies the mode of the deny settings. Choose from 'denyDelete', 'denyWriteAndDelete', 'none'.              | `denyDelete`, `denyWriteAndDelete`, `none`                                                                                                       | No       |
| `deny-settings-excluded-actions`      | Specifies the excluded actions for the deny settings.                                                         | Free-text                                                                                                                                        | No       |
| `deny-settings-excluded-principals`   | Specifies the excluded principals for the deny settings.                                                      | Free-text                                                                                                                                        | No       |
| `deny-settings-apply-to-child-scopes` | When specified, the deny setting mode configuration also applies to the child scope of the managed resources.  | Free-text                                                                                                                                        | No       |
| `bypass-stack-out-of-sync-error`      | Specifies whether to bypass the stack out of sync error. Choose from 'true' or 'false'.                       | `true`, `false`                                                                                                                                  | No       |
| `description`                         | Specifies the description of the deploymentStack.                                                             | Free-text                                                                                                                                        | No       |
| `tags`                                | Specifies the tags for the deploymentStack.                                                                   | Free-text                                                                                                                                        | No       |

## Outputs

The action provides outputs from the deployment operation, which can be accessed in subsequent steps of a workflow. These outputs are useful for dynamically referencing values generated during the deployment process, such as resource IDs, endpoint URLs, or other outputs defined in Bicep templates.

**Accessing Outputs**

After the deployment step has been executed, outputs can be accessed using the outputs property of the step's ID. For example, if the deployment step's ID is `deployment`, its outputs can be accessed as `${{ steps.deployment.outputs.<outputName> }}`.

```yaml
- name: Print Deployment Outputs
  run: |
    echo "intOutput: ${{ steps.deployment.outputs.intOutput }}"
    echo "stringOutput: ${{ steps.deployment.outputs.stringOutput }}"
```

**Defining Outputs in Bicep**

Outputs are defined in the Bicep template using the output keyword. Outputs that need to be used in the workflow must be declared in the Bicep template being deployed. For example:

```yaml
output intOutput int = 42
output stringOutput string = 'Hello, World!'
```

For detailed guidance, refer to the [Bicep Outputs](https://learn.microsoft.com/azure/azure-resource-manager/bicep/outputs) documentation.

**Practical Usage**

1. **Define Outputs in the Bicep Template**: Declare the outputs in the `.bicep` file as shown above.
2. **Reference Outputs in Workflow**: Use the `${{ steps.<step_id>.outputs.<output_name> }}` syntax in subsequent steps to access the values.

These outputs can then be leveraged for:

- Debugging deployment results.
- Passing values dynamically to other steps or jobs.
- Integrating deployment results into a CI/CD pipeline.

## Contributing

This project welcomes contributions and suggestions. Most contributions require
you to agree to a Contributor License Agreement (CLA) declaring that you have
the right to, and actually do, grant us the rights to use your contribution. For
details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., status check,
comment). Simply follow the instructions provided by the bot. You will only need
to do this once across all repos using our CLA.

This project has adopted the
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the
[Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any
additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or
services. Authorized use of Microsoft trademarks or logos is subject to and must
follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must
not cause confusion or imply Microsoft sponsorship. Any use of third-party
trademarks or logos are subject to those third-party's policies.
