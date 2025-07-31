targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Resource group name')
param resourceGroupName string = 'rg-${environmentName}'

@description('Application environment variables')
param nodeEnv string = 'production'

@secure()
param jwtSecret string = ''

@secure()
param sessionSecret string = ''

param emailUser string = ''

@secure()
param emailPass string = ''

param paypalClientId string = ''

@secure()
param paypalClientSecret string = ''

// Generate a unique resource token
var resourceToken = uniqueString(subscription().id, location, environmentName)
var resourcePrefix = 'scp'

// Create resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
}

// Deploy main resources
module main 'main-resources.bicep' = {
  name: 'main-resources'
  scope: rg
  params: {
    location: location
    environmentName: environmentName
    resourceToken: resourceToken
    resourcePrefix: resourcePrefix
    nodeEnv: nodeEnv
    jwtSecret: jwtSecret
    sessionSecret: sessionSecret
    emailUser: emailUser
    emailPass: emailPass
    paypalClientId: paypalClientId
    paypalClientSecret: paypalClientSecret
  }
}

// Outputs
output RESOURCE_GROUP_ID string = rg.id
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = main.outputs.AZURE_CONTAINER_REGISTRY_ENDPOINT
output SICHRPLACE_WEB_URI string = main.outputs.SICHRPLACE_WEB_URI
output CONTAINER_APP_NAME string = main.outputs.CONTAINER_APP_NAME
output COSMOS_ACCOUNT_NAME string = main.outputs.COSMOS_ACCOUNT_NAME
output STORAGE_ACCOUNT_NAME string = main.outputs.STORAGE_ACCOUNT_NAME
