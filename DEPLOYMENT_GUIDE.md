# 🚀 SichrPlace Deployment Guide

## Step 1: Start Docker
1. Start Docker Desktop on your Windows machine
2. Wait for Docker to be fully running

## Step 2: Login to Azure
```powershell
az login
azd auth login
```

## Step 3: Initialize and Deploy
```powershell
# Navigate to your project directory
cd "c:\Users\ÖmerÜckale\OneDrive - NEA X GmbH\Desktop\devsichrplace\SichrPlace77-main\SichrPlace77-main"

# Initialize the deployment
azd init

# Set environment variables (you'll be prompted for these)
azd env set JWT_SECRET "your-super-secret-jwt-key-here-at-least-64-characters-long"
azd env set SESSION_SECRET "your-session-secret-key-here-at-least-32-characters"
azd env set EMAIL_USER "your-email@gmail.com"
azd env set EMAIL_PASS "your-email-app-password"
azd env set PAYPAL_CLIENT_ID "your-paypal-client-id"
azd env set PAYPAL_CLIENT_SECRET "your-paypal-client-secret"

# Deploy to Azure
azd up
```

## Step 4: Custom Domain Setup (www.sichrplace.com)

After deployment, you'll get a temporary URL like: `https://az-scp-app-[random].gentle-meadow-[random].eastus.azurecontainerapps.io`

To set up your custom domain:

1. **Purchase Domain**: Ensure you own `sichrplace.com`
2. **Add Custom Domain**: 
   ```powershell
   az containerapp hostname add --name [your-container-app-name] --resource-group [your-resource-group] --hostname www.sichrplace.com
   ```
3. **Configure DNS**: Add CNAME record in your domain registrar:
   - Name: `www`
   - Value: `[your-container-app-url]`

## Step 5: SSL Certificate
Azure will automatically provide a managed SSL certificate for your custom domain.

## What Gets Deployed:
- 🐳 Container App with your SichrPlace application
- 🗄️ Azure Cosmos DB for MongoDB (database)
- 📦 Azure Storage Account (file storage)
- 🔍 Application Insights (monitoring)
- 🏗️ Container Registry (for your Docker images)

## Environment URLs:
- **Preview URL**: Will be provided after deployment
- **Target Custom URL**: https://www.sichrplace.com

## Security Features:
- Managed SSL certificates
- Azure AD integration ready
- CORS enabled
- Environment secrets securely stored
