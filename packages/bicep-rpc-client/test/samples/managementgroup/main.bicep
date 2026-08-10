targetScope = 'managementGroup'

param policyAssignmentName string

resource policyAssignment 'Microsoft.Authorization/policyAssignments@2022-06-01' = {
  name: policyAssignmentName
  properties: {
    policyDefinitionId: '/providers/Microsoft.Management/managementGroups/${managementGroup().name}/providers/Microsoft.Authorization/policyDefinitions/00000000-0000-0000-0000-000000000000'
  }
}
