#!/bin/bash

###############################################################################
# Update/Redeploy Script for SLA Application
# Usage: ./scripts/update.sh
# This script pulls latest code and redeploys the application
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SLA Application Update Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verify .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Error: .env.production not found${NC}"
    exit 1
fi

# Source environment file
set -a
source .env.production
set +a

# Save backup of database (optional)
if command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Creating database backup...${NC}"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-operations_control} > "$BACKUP_FILE"
    echo -e "${GREEN}✓ Backup saved to $BACKUP_FILE${NC}"
fi

# Pull latest code
echo ""
echo -e "${YELLOW}Pulling latest code from repository...${NC}"
git pull origin main
echo -e "${GREEN}✓ Code pulled successfully${NC}"

# Stop current containers
echo ""
echo -e "${YELLOW}Stopping current containers...${NC}"
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"

# Build new image
echo ""
echo -e "${YELLOW}Building new application image...${NC}"
docker-compose build --no-cache app
echo -e "${GREEN}✓ Application image built${NC}"

# Start containers
echo ""
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Run database migrations
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose run --rm app npx prisma migrate deploy
echo -e "${GREEN}✓ Migrations applied${NC}"

# Invalidate all active sessions on rebuild
echo ""
echo -e "${YELLOW}Invalidating all active sessions for security...${NC}"
# This increments the MIN_AUTH_VERSION system setting or creates it if it doesn't exist
docker-compose run --rm app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'MIN_AUTH_VERSION' } });
  const currentVersion = setting ? parseInt(setting.value) : 0;
  const nextVersion = currentVersion + 1;
  await prisma.systemSetting.upsert({
    where: { key: 'MIN_AUTH_VERSION' },
    update: { value: nextVersion.toString() },
    create: { key: 'MIN_AUTH_VERSION', value: '1' }
  });
  console.log('✓ Global auth version incremented to ' + (setting ? nextVersion : 1));
}
main().catch(err => { console.error(err); process.exit(1); }).finally(() => prisma.\$disconnect());
"
echo -e "${GREEN}✓ All sessions invalidated${NC}"


# Verify deployment
echo ""
echo -e "${YELLOW}Verifying deployment...${NC}"
if docker-compose ps | grep -q "app.*Up"; then
    echo -e "${GREEN}✓ Application is running${NC}"
else
    echo -e "${RED}❌ Application failed to start${NC}"
    docker-compose logs app | tail -30
    exit 1
fi

if docker-compose ps | grep -q "postgres.*Up"; then
    echo -e "${GREEN}✓ Database is running${NC}"
else
    echo -e "${RED}❌ Database failed to start${NC}"
    docker-compose logs postgres | tail -30
    exit 1
fi

# Display update summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Update Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Current deployment status:"
docker-compose ps
echo ""
echo "If something went wrong, restore the backup:"
echo "  docker-compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-operations_control} < $BACKUP_FILE"
echo ""
