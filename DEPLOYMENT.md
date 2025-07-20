# Find Peers Server - Production Deployment

This guide will help you build and deploy the Find Peers server using Docker for production on Azure.

## Prerequisites

- Docker installed on your local machine
- Azure account with Container Registry or App Service
- Environment variables configured

## Production Build

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with your actual production values:

- Database connection string
- JWT secrets
- Email configuration
- Client URL

### 2. Build Docker Image

Build the production Docker image:

```bash
docker build -t find-peers-server:latest .
```

### 3. Test Locally (Optional)

Test the production build locally:

```bash
# Using Docker Compose
docker-compose up

# Or run the container directly
docker run -p 3000:3000 --env-file .env.production find-peers-server:latest
```

## Azure Deployment Options

### Option 1: Azure Container Registry + Azure App Service

1. **Create Azure Container Registry:**

```bash
az acr create --resource-group myResourceGroup --name myregistry --sku Basic
```

2. **Login to ACR:**

```bash
az acr login --name myregistry
```

3. **Tag and push image:**

```bash
docker tag find-peers-server:latest myregistry.azurecr.io/find-peers-server:latest
docker push myregistry.azurecr.io/find-peers-server:latest
```

4. **Deploy to Azure App Service:**

```bash
az webapp create --resource-group myResourceGroup --plan myAppServicePlan --name find-peers-api --deployment-container-image-name myregistry.azurecr.io/find-peers-server:latest
```

### Option 2: Azure Container Instances

```bash
az container create --resource-group myResourceGroup --name find-peers-server --image myregistry.azurecr.io/find-peers-server:latest --registry-login-server myregistry.azurecr.io --registry-username <username> --registry-password <password> --dns-name-label find-peers-api --ports 3000
```

## Environment Variables for Azure

Make sure to set these environment variables in your Azure service:

PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://postgres.enhyyjjqjhomdkevfvao:jp1z3H7fLQ7cMw6E@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
JWT_ACCESS_SECRET="my_name_is_safal_bhandari"
JWT_REFRESH_SECRET="my_name_is_safal_bhandari"

# Mailer
SMTP_HOST=smtp.maileroo.com
SMTP_PORT=587
SMTP_USER=jd_CV@54af697aa68662c7.maileroo.org
SMTP_PASS=6d2ad7ec883d6199fc262ac0
FROM_EMAIL=jd_CV@54af697aa68662c7.maileroo.org
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:3000

SMTP_SECURE=true

## Database Migration

After deployment, run database migrations:

```bash
# If using Azure Container Registry
az container exec --resource-group myResourceGroup --name find-peers-server --exec-command "npx prisma migrate deploy"

# Or connect to your container and run:
npx prisma migrate deploy
```

## Health Check

The server includes a health check endpoint at `/api/health` that returns:

- Server status
- Timestamp
- Database connection status

## Security Features

The production build includes:

- Helmet for security headers
- Rate limiting
- CORS configuration
- Non-root user execution
- Proper error handling
- Request logging

## Monitoring

Check container logs:

```bash
# Azure Container Instances
az container logs --resource-group myResourceGroup --name find-peers-server

# Azure App Service
az webapp log tail --resource-group myResourceGroup --name find-peers-api
```

## Scaling

For high availability, consider:

- Azure App Service with multiple instances
- Azure Container Apps for serverless scaling
- Load balancer for multiple container instances

## Backup Strategy

- Regular database backups
- Container image versioning
- Environment variable backup
- Log retention policies
