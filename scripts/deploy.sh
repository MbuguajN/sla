#!/bin/bash

###############################################################################
# Initial Deployment Script for SLA Application
# Usage: ./scripts/deploy.sh
# This script should be run once on a fresh Linux server
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}SLA Application Docker Deployment${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}❌ Error: This script must run on Linux${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
else
    echo -e "${GREEN}✓ Docker is installed${NC}"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Installing...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}✓ Docker Compose is installed${NC}"
fi

# Verify Docker service is running
echo -e "${YELLOW}Checking Docker service...${NC}"
if sudo systemctl is-active --quiet docker; then
    echo -e "${GREEN}✓ Docker service is running${NC}"
else
    echo -e "${YELLOW}Starting Docker service...${NC}"
    sudo systemctl start docker
    sudo systemctl enable docker
    echo -e "${GREEN}✓ Docker service started${NC}"
fi

# Add current user to docker group (optional, for non-root access)
if [[ "$EUID" -ne 0 ]]; then
    if ! id -nG "$USER" | grep -qw "docker"; then
        echo -e "${YELLOW}Adding $USER to docker group (requires sudo)...${NC}"
        sudo usermod -aG docker "$USER"
        echo -e "${YELLOW}You may need to log out and log back in for this to take effect${NC}"
    fi
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}No .env.production found. Creating from template...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env.production
        echo -e "${YELLOW}⚠️  Please edit .env.production with your production values:${NC}"
        echo "   - Set POSTGRES_PASSWORD"
        echo "   - Set NEXTAUTH_SECRET (run: openssl rand -base64 32)"
        echo "   - Set NEXTAUTH_URL to your domain"
        echo ""
        echo -e "${YELLOW}Edit the file and run this script again${NC}"
        nano .env.production
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

# Source environment file
set -a
source .env.production
set +a

# Verify required environment variables
echo -e "${YELLOW}Verifying environment variables...${NC}"
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD is not set${NC}"
    exit 1
fi
if [ -z "$NEXTAUTH_SECRET" ]; then
    echo -e "${RED}❌ NEXTAUTH_SECRET is not set${NC}"
    exit 1
fi
if [ -z "$NEXTAUTH_URL" ]; then
    echo -e "${RED}❌ NEXTAUTH_URL is not set${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Required environment variables are set${NC}"

# Build and start containers
echo ""
echo -e "${YELLOW}Building and starting containers...${NC}"
docker-compose up -d --build

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Initialize database schema
echo -e "${YELLOW}Initializing database schema...${NC}"
docker-compose run --rm app npx prisma db push --skip-generate

# Seed database if needed (optional)
# echo -e "${YELLOW}Seeding database...${NC}"
# docker-compose run --rm app npx prisma db seed

# Verify deployment
echo ""
echo -e "${YELLOW}Verifying deployment...${NC}"
if docker-compose ps | grep -q "app.*Up"; then
    echo -e "${GREEN}✓ Application is running${NC}"
else
    echo -e "${RED}❌ Application failed to start${NC}"
    docker-compose logs app | tail -20
    exit 1
fi

if docker-compose ps | grep -q "postgres.*Up"; then
    echo -e "${GREEN}✓ Database is running${NC}"
else
    echo -e "${RED}❌ Database failed to start${NC}"
    docker-compose logs postgres | tail -20
    exit 1
fi

# Display deployment summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Application is running at:"
if [ -z "$NEXTAUTH_URL" ]; then
    echo "  → http://localhost:3000"
else
    echo "  → $NEXTAUTH_URL"
fi
echo ""
echo "Useful commands:"
echo "  View logs:           docker-compose logs -f"
echo "  Stop services:       docker-compose down"
echo "  Restart services:    docker-compose restart"
echo "  Access database:     docker-compose exec postgres psql -U postgres -d operations_control"
echo ""
echo "To update the application, run:"
echo "  ./scripts/update.sh"
echo ""
