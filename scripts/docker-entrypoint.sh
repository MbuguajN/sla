#!/bin/sh
set -e

# Wait for DB to be ready (already handled by docker-compose healthcheck but safe to keep)
echo "Generating Prisma Client..."
npx prisma generate || echo "Prisma generate failed"

echo "Pushing database schema..."
npx prisma db push --accept-data-loss || echo "Prisma db push failed"

if [ "$NODE_ENV" = "production" ]; then
  echo "Starting production server at $(date)..."
  # Set HOSTNAME here just in case
  export HOSTNAME="0.0.0.0"
  node server.js
else
  echo "Starting dev server..."
  npm run dev
fi
