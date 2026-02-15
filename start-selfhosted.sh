#!/bin/bash
# =====================================================
# SichrPlace Self-Hosted Quick Start
# Launches the entire stack with one command
# =====================================================

set -e

echo "🏠 SichrPlace Self-Hosted Stack"
echo "================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose v2."
    exit 1
fi

# Create .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Edit .env with your actual secrets before running in production!"
fi

# Create SSL cert directory
mkdir -p infra/nginx/ssl

# Generate self-signed cert for development
if [ ! -f infra/nginx/ssl/fullchain.pem ]; then
    echo "🔐 Generating self-signed SSL certificate for development..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout infra/nginx/ssl/privkey.pem \
        -out infra/nginx/ssl/fullchain.pem \
        -subj "/C=DE/ST=Bavaria/L=Munich/O=SichrPlace/CN=localhost" 2>/dev/null
fi

echo ""
echo "🚀 Starting all services..."
echo ""

docker compose -f docker-compose.selfhosted.yml up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.selfhosted.yml ps

echo ""
echo "============================================"
echo "✅ SichrPlace Self-Hosted Stack is running!"
echo "============================================"
echo ""
echo "  🌐 API:          https://localhost/api/health"
echo "  📖 Swagger:       https://localhost/swagger-ui/"
echo "  🗄️  MSSQL:        localhost:1433"
echo "  📦 MinIO Console: http://localhost:9001"
echo "  📧 MailHog:       http://localhost:8025"
echo "  💾 Redis:         localhost:6379"
echo ""
echo "  To stop:  docker compose -f docker-compose.selfhosted.yml down"
echo "  To logs:  docker compose -f docker-compose.selfhosted.yml logs -f"
echo ""
