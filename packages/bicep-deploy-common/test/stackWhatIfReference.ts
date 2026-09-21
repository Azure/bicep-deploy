// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export const expectedStacksWhatIf1 = `Resource and property changes are indicated with these symbols:
  <GREEN>+<RESET> Create              ! Unsupported
  <MAGENTA>~<RESET> Modify              <RED>-<RESET> Delete
  = NoChange            <BLUE>v<RESET> Detach

<YELLOW>Changes to Stack /subscriptions/6d41d86d-eb6b-473a-b31d-bbd084e1814d/resourceGroups/503ace4c-9b1c-4059-a3e9-09553d24e9e1/providers/Microsoft.Resources/deploymentStacks/testStack_9ef16884f0dad7d0e5de3d3ec57:<RESET>
<MAGENTA>~<RESET> DeploymentScope: <MAGENTA>"ThisIsBefore"<RESET> => <MAGENTA>"ThisIsAfter"<RESET>
<MAGENTA>~<RESET> DenySettings.Mode: <MAGENTA>"None"<RESET> => <MAGENTA>"DenyDelete"<RESET>
<MAGENTA>~<RESET> DenySettings.ApplyToChildScopes: <MAGENTA>"False"<RESET> => <MAGENTA>"True"<RESET>
<MAGENTA>~<RESET> DenySettings.ExcludedPrincipals:
  <GREEN>+<RESET> <GREEN>"004afc20-146e-4932-a8b5-3098461c46a5"<RESET>
  <GREEN>+<RESET> <GREEN>"e6a513a0-b872-4355-82b9-47645fb30d3a"<RESET>
<MAGENTA>~<RESET> DenySettings.ArrayOfMixed:
  <MAGENTA>~<RESET> 0:
    <MAGENTA>~<RESET> properties.something: <MAGENTA>"B4"<RESET> => <MAGENTA>"Now"<RESET>
  <GREEN>+<RESET> 1:
    <GREEN>+<RESET> <GREEN>"now"<RESET>
  <RED>-<RESET> 2:
    <RED>-<RESET> <RED>"iWasDeleted"<RESET>

<YELLOW>Changes to Managed Resources:<RESET>

Azure
  <MAGENTA>~<RESET> <MAGENTA>/subscriptions/648e207a-a8cf-4a20-a557-59ee31ea46a3/resourceGroups/WhatIfTestNew/providers/Microsoft.Web/sites/web-gwfjnc7423h2a/providers/Microsoft.Insights/diagnosticSettings/diag-web-gwfjnc7423h2a [2021-05-01-preview]<RESET>
    = Management Status: "managed"
    = Deny Status: "none"
    <MAGENTA>~<RESET> properties.nestedArrays:
      <GREEN>+<RESET> 0:
          <GREEN>[]<RESET>
      <GREEN>+<RESET> 1:
          <GREEN>[<RESET>
          <GREEN>  "1",<RESET>
          <GREEN>  "2"<RESET>
          <GREEN>]<RESET>
    <MAGENTA>~<RESET> properties.logs:
      <MAGENTA>~<RESET> 0:
        <MAGENTA>~<RESET> enabled: <MAGENTA>True<RESET> => <MAGENTA>False<RESET>
        <RED>-<RESET> retentionPolicy.days: <RED>0<RESET>
      <MAGENTA>~<RESET> 1:
        <RED>-<RESET> retentionPolicy.days: <RED>0<RESET>
      <MAGENTA>~<RESET> 2:
        <MAGENTA>~<RESET> category: <MAGENTA>"AppServiceAppLogs"<RESET> => <MAGENTA>"DanteFunLogs"<RESET>
        <MAGENTA>~<RESET> enabled: <MAGENTA>False<RESET> => <MAGENTA>True<RESET>
        <RED>-<RESET> retentionPolicy.days: <RED>0<RESET>
      <RED>-<RESET> 3:
          <RED>{<RESET>
          <RED>  "category": "AppServiceAuditLogs",<RESET>
          <RED>  "enabled": false,<RESET>
          <RED>  "retentionPolicy": {<RESET>
          <RED>    "days": 0,<RESET>
          <RED>    "enabled": false<RESET>
          <RED>  }<RESET>
          <RED>}<RESET>
      <RED>-<RESET> 4:
          <RED>{<RESET>
          <RED>  "category": "AppServiceIPSecAuditLogs",<RESET>
          <RED>  "enabled": false,<RESET>
          <RED>  "retentionPolicy": {<RESET>
          <RED>    "days": 0,<RESET>
          <RED>    "enabled": false<RESET>
          <RED>  }<RESET>
          <RED>}<RESET>
      <RED>-<RESET> 5:
          <RED>{<RESET>
          <RED>  "category": "AppServicePlatformLogs",<RESET>
          <RED>  "enabled": false,<RESET>
          <RED>  "retentionPolicy": {<RESET>
          <RED>    "days": 0,<RESET>
          <RED>    "enabled": false<RESET>
          <RED>  }<RESET>
          <RED>}<RESET>
      <RED>-<RESET> 6:
          <RED>{<RESET>
          <RED>  "category": "AppServiceAuthenticationLogs",<RESET>
          <RED>  "enabled": false,<RESET>
          <RED>  "retentionPolicy": {<RESET>
          <RED>    "days": 0,<RESET>
          <RED>    "enabled": false<RESET>
          <RED>  }<RESET>
          <RED>}<RESET>
    <MAGENTA>~<RESET> properties.metrics:
      <MAGENTA>~<RESET> 0:
        <MAGENTA>~<RESET> category: <MAGENTA>"AllMetrics"<RESET> => <MAGENTA>"DanteMetrics"<RESET>
        <RED>-<RESET> retentionPolicy.days: <RED>0<RESET>
      <GREEN>+<RESET> 1:
          <GREEN>{<RESET>
          <GREEN>  "category": "AllMetrics",<RESET>
          <GREEN>  "enabled": false,<RESET>
          <GREEN>  "retentionPolicy": {<RESET>
          <GREEN>    "enabled": false<RESET>
          <GREEN>  }<RESET>
          <GREEN>}<RESET>
  <MAGENTA>~<RESET> <MAGENTA>/subscriptions/6d41d86d-eb6b-473a-b31d-bbd084e1814d/resourceGroups/503ace4c-9b1c-4059-a3e9-09553d24e9e1/providers/Microsoft.Test/testA/resourceA [2021-05-01]<RESET>
    = Management Status: "Managed"
    <MAGENTA>~<RESET> Deny Status: <MAGENTA>"None"<RESET> => <MAGENTA>"DenyDelete"<RESET>
    <MAGENTA>~<RESET> properties.properties1: <MAGENTA>"resourceA-before"<RESET> => <MAGENTA>"resourceA-after"<RESET>
  = /subscriptions/6d41d86d-eb6b-473a-b31d-bbd084e1814d/resourceGroups/503ace4c-9b1c-4059-a3e9-09553d24e9e1/providers/Microsoft.Test/testB/resourceB [2021-05-01]
    = Management Status: "Managed"
    <MAGENTA>~<RESET> Deny Status: <MAGENTA>"None"<RESET> => <MAGENTA>"DenyDelete"<RESET>
  <GREEN>+<RESET> <GREEN>/subscriptions/6d41d86d-eb6b-473a-b31d-bbd084e1814d/resourceGroups/503ace4c-9b1c-4059-a3e9-09553d24e9e1/providers/Microsoft.Test/testD/resourceD [2021-05-01]<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"NotManaged"<RESET> => <MAGENTA>"Managed"<RESET>
    <MAGENTA>~<RESET> Deny Status: <MAGENTA>"None"<RESET> => <MAGENTA>"DenyDelete"<RESET>

  >> <MAGENTA>Potential Resource Changes (Learn more at https://aka.ms/whatIfPotentialChanges)<RESET>
  <CYAN>?<RESET><MAGENTA>~<RESET> <CYAN>[Potential] <RESET><MAGENTA>/subscriptions/6d41d86d-eb6b-473a-b31d-bbd084e1814d/resourceGroups/503ace4c-9b1c-4059-a3e9-09553d24e9e1/providers/Microsoft.Test/testC/resourceC [2021-05-01]<RESET>
    = Management Status: "Managed"
    <MAGENTA>~<RESET> Deny Status: <MAGENTA>"None"<RESET> => <MAGENTA>"DenyDelete"<RESET>
    <MAGENTA>~<RESET> properties.properties1: <MAGENTA>"resourceC-before"<RESET> => <MAGENTA>"resourceC-potential-after"<RESET>
  <CYAN>?<RESET><RED>-<RESET> <CYAN>[Potential] <RESET><RED>/subscriptions/6d41d86d-eb6b-473a-b31d-bbd084e1814d/resourceGroups/503ace4c-9b1c-4059-a3e9-09553d24e9e1/providers/Microsoft.Test/testC/resourceC<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"Managed"<RESET> => <MAGENTA>"NotManaged"<RESET>
    = Deny Status: "None"

Contoso@2.0.0
  <MAGENTA>~<RESET> <MAGENTA>Contoso/example name="abcResource" [v1]<RESET>
    = Management Status: "Managed"
    = Deny Status: "NotSupported"
    <MAGENTA>~<RESET> properties.properties1: <MAGENTA>"resourceA-before"<RESET> => <MAGENTA>"resourceA-after"<RESET>
    <GREEN>+<RESET> properties.someConfig: <GREEN>{<RESET>
      <GREEN>  "type": "object",<RESET>
      <GREEN>  "value": {<RESET>
      <GREEN>    "enabled": true,<RESET>
      <GREEN>    "values": [<RESET>
      <GREEN>      1,<RESET>
      <GREEN>      2,<RESET>
      <GREEN>      3<RESET>
      <GREEN>    ]<RESET>
      <GREEN>  }<RESET>
      <GREEN>}<RESET>
    <RED>-<RESET> properties.some.deeply.nested.array: <RED>[<RESET>
      <RED>  "one",<RESET>
      <RED>  "two"<RESET>
      <RED>]<RESET>
  <RED>-<RESET> <RED>Contoso/example name="defResource"<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"Managed"<RESET> => <MAGENTA>"Unmanaged"<RESET>
    <MAGENTA>~<RESET> Deny Status: <MAGENTA>"NotSupported"<RESET> => <MAGENTA>"None"<RESET>

  >> <MAGENTA>Potential Resource Changes (Learn more at https://aka.ms/whatIfPotentialChanges)<RESET>
  <CYAN>?<RESET>! <CYAN>[Potential] <RESET>Contoso/noPreview 
    <MAGENTA>~<RESET> Management Status: <MAGENTA>null<RESET> => <MAGENTA>"Managed"<RESET>
    <MAGENTA>~<RESET> Deny Status: <MAGENTA>null<RESET> => <MAGENTA>"NotSupported"<RESET>

Kubernetes@2.0.0 namespace="myNs", kubeconfig=<Secret 'mySecret' in key vault '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.KeyVault/vaults/myKeyVault'>
  <GREEN>+<RESET> <GREEN>app/Deployment name="kubeAppDeployment" [v1]<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>null<RESET> => <MAGENTA>"Managed"<RESET>
    <MAGENTA>~<RESET> Deny Status: <MAGENTA>null<RESET> => <MAGENTA>"NotApplicable"<RESET>
    <MAGENTA>~<RESET> properties.property1: <MAGENTA>"kubeAppDeployment-before"<RESET> => <MAGENTA>"kubeAppDeployment-after"<RESET>

<RED>Deleting - <RESET>Resources Marked for Deletion 2 total:

Azure

  >> <RED>Potential Deletions 1 total (Learn more at https://aka.ms/whatIfPotentialChanges)<RESET>
  <CYAN>?<RESET><RED>-<RESET> <CYAN>[Potential] <RESET><RED>/subscriptions/6d41d86d-eb6b-473a-b31d-bbd084e1814d/resourceGroups/503ace4c-9b1c-4059-a3e9-09553d24e9e1/providers/Microsoft.Test/testC/resourceC<RESET>

Contoso@2.0.0
  <RED>-<RESET> <RED>Contoso/example name="defResource"<RESET>

Diagnostics (5):

INFO: [InfoCode]
  Message: InfoMessage

<YELLOW>WARNING: [Abc]<RESET>
  <YELLOW>Message: Xyz<RESET>

<YELLOW>WARNING: [NoSupportForExtensibleResources]<RESET>
  <YELLOW>Message: Extensible resources are currently not supported<RESET>

<RED>ERROR: [ErrorCode]<RESET>
  <RED>Message: ErrorMessage<RESET>

<RED>ERROR: [ErrorCode]<RESET>
  <RED>Message: This is an error diagnostic with a target.<RESET>
  <RED>Target: /subscriptions/d41d86d-eb6b-473a-b31d-bbd084e1814d/resourceGroups/503ace4c-9b1c-4059-a3e9-09553d24e9e1/providers/Microsoft.Test/tests/testResource<RESET>

`;

export const expectedStacksWhatIf2 = `Resource and property changes are indicated with these symbols:
  <GREEN>+<RESET> Create              ! Unsupported
  <MAGENTA>~<RESET> Modify              <RED>-<RESET> Delete
  = NoChange            <BLUE>v<RESET> Detach

<YELLOW>Changes to Managed Resources:<RESET>

Azure
  <BLUE>v<RESET> <BLUE>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Network/networkSecurityGroups/wv-nsg-mjwo5pow6lmvm<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"managed"<RESET> => <MAGENTA>"notManaged"<RESET>
    = Deny Status: "none"
  <BLUE>v<RESET> <BLUE>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Network/routeTables/wv-routes-mjwo5pow6lmvm<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"managed"<RESET> => <MAGENTA>"notManaged"<RESET>
    = Deny Status: "none"
  <BLUE>v<RESET> <BLUE>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Network/virtualNetworks/wv-vnet-mjwo5pow6lmvm<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"managed"<RESET> => <MAGENTA>"notManaged"<RESET>
    = Deny Status: "none"
  <MAGENTA>~<RESET> <MAGENTA>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Resources/templateSpecs/wv-spec-mjwo5pow6lmvm [2022-02-01]<RESET>
    = Management Status: "managed"
    = Deny Status: "none"
    <MAGENTA>~<RESET> properties.description: <MAGENTA>"Baseline description"<RESET> => <MAGENTA>"Updated description with nested content changes"<RESET>
    <MAGENTA>~<RESET> properties.displayName: <MAGENTA>"WhatIf visual validation"<RESET> => <MAGENTA>"WhatIf visual validation updated"<RESET>
  <MAGENTA>~<RESET> <MAGENTA>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Resources/templateSpecs/wv-spec-mjwo5pow6lmvm/versions/v1 [2022-02-01]<RESET>
    = Management Status: "managed"
    = Deny Status: "none"
    <MAGENTA>~<RESET> properties.mainTemplate.contentVersion: <MAGENTA>"1.0.0.0"<RESET> => <MAGENTA>"2.0.0.0"<RESET>
    <MAGENTA>~<RESET> properties.mainTemplate.outputs.state.value: <MAGENTA>"before"<RESET> => <MAGENTA>"after"<RESET>
    <GREEN>+<RESET> properties.mainTemplate.outputs.nested: <GREEN>{<RESET>
      <GREEN>  "type": "object",<RESET>
      <GREEN>  "value": {<RESET>
      <GREEN>    "enabled": true,<RESET>
      <GREEN>    "values": [<RESET>
      <GREEN>      1,<RESET>
      <GREEN>      2,<RESET>
      <GREEN>      3<RESET>
      <GREEN>    ]<RESET>
      <GREEN>  }<RESET>
      <GREEN>}<RESET>
    <MAGENTA>~<RESET> properties.mainTemplate.variables.nestedObject.level1.level2: <MAGENTA>"before"<RESET> => <MAGENTA>"after"<RESET>
    <GREEN>+<RESET> properties.mainTemplate.variables.nestedObject.level1.addedArray: <GREEN>[<RESET>
      <GREEN>  "one",<RESET>
      <GREEN>  "two"<RESET>
      <GREEN>]<RESET>
    <GREEN>+<RESET> properties.mainTemplate.variables.nestedObject.level1.addedBoolean: <GREEN>True<RESET>
    <GREEN>+<RESET> properties.mainTemplate.parameters: <GREEN>{<RESET>
      <GREEN>  "message": {<RESET>
      <GREEN>    "defaultValue": "hello",<RESET>
      <GREEN>    "type": "string"<RESET>
      <GREEN>  }<RESET>
      <GREEN>}<RESET>
  <GREEN>+<RESET> <GREEN>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Storage/storageAccounts/wvcreatemjwo5pow6lmvm [2023-05-01]<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"notManaged"<RESET> => <MAGENTA>"managed"<RESET>
    = Deny Status: "none"
  <MAGENTA>~<RESET> <MAGENTA>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Storage/storageAccounts/wvmodmjwo5pow6lmvm [2023-05-01]<RESET>
    = Management Status: "managed"
    = Deny Status: "none"
    <MAGENTA>~<RESET> sku.name: <MAGENTA>"Standard_LRS"<RESET> => <MAGENTA>"Standard_GRS"<RESET>
    <MAGENTA>~<RESET> tags.modifiedTag: <MAGENTA>"before"<RESET> => <MAGENTA>"after"<RESET>
    <RED>-<RESET> tags.oldTag: <RED>"deleted-in-updated-template"<RESET>
    <GREEN>+<RESET> tags.newTag: <GREEN>"created-in-updated-template"<RESET>
  <BLUE>v<RESET> <BLUE>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Storage/storageAccounts/wvremovemjwo5pow6lmvm<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"managed"<RESET> => <MAGENTA>"notManaged"<RESET>
    = Deny Status: "none"
  = /subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Storage/storageAccounts/wvsamemjwo5pow6lmvm [2023-05-01]
    = Management Status: "managed"
    = Deny Status: "none"
  <GREEN>+<RESET> <GREEN>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/RP.Namespace/widgets/bar [1999-12-31]<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"notManaged"<RESET> => <MAGENTA>"managed"<RESET>
    = Deny Status: "none"
  <GREEN>+<RESET> <GREEN>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/RP.Namespace/widgets/foo [1999-12-31]<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"notManaged"<RESET> => <MAGENTA>"managed"<RESET>
    = Deny Status: "none"

  >> <MAGENTA>Potential Resource Changes (Learn more at https://aka.ms/whatIfPotentialChanges)<RESET>
  <CYAN>?<RESET><GREEN>+<RESET> <CYAN>[Potential] <RESET><GREEN>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Storage/storageAccounts/wvpotcreatemjwo5pow6lmvm [2023-05-01]<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"notManaged"<RESET> => <MAGENTA>"managed"<RESET>
    = Deny Status: "none"
  <CYAN>?<RESET><MAGENTA>~<RESET> <CYAN>[Potential] <RESET><MAGENTA>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Storage/storageAccounts/wvpotremovemjwo5pow6lmvm [2023-05-01]<RESET>
    = Management Status: "managed"
    = Deny Status: "none"
    <GREEN>+<RESET> condition: <GREEN>"[greater(int(utcNow('%f')), 4)]"<RESET>
  <CYAN>?<RESET><BLUE>v<RESET> <CYAN>[Potential] <RESET><BLUE>/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/Microsoft.Storage/storageAccounts/wvpotremovemjwo5pow6lmvm<RESET>
    <MAGENTA>~<RESET> Management Status: <MAGENTA>"managed"<RESET> => <MAGENTA>"notManaged"<RESET>
    = Deny Status: "none"

Diagnostics (2):

<YELLOW>WARNING: [ResourceDeployedMultipleTimes]<RESET>
  <YELLOW>Message: The resource '/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/RP.Namespace/widgets/bar' is defined multiple times in this deployment. Only the final state of the resource is shown.<RESET>
  <YELLOW>Target: /subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/RP.Namespace/widgets/bar<RESET>

<YELLOW>WARNING: [ResourceDeployedMultipleTimes]<RESET>
  <YELLOW>Message: The resource '/subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/RP.Namespace/widgets/foo' is defined multiple times in this deployment. Only the final state of the resource is shown.<RESET>
  <YELLOW>Target: /subscriptions/390ba170-3e2a-41c4-b372-15d9c5ae6e81/resourceGroups/whatif-change-40011/providers/RP.Namespace/widgets/foo<RESET>

`;
