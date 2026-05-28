param input string

resource ts 'Microsoft.Resources/templateSpecs@2022-02-01' = {
  name: input
  location: resourceGroup().location
  properties: {}
}
