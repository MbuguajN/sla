#!/bin/sh
set -e

# Wait for DB to be ready (already handled by docker-compose healthcheck but safe to keep)
echo "Generating Prisma Client..."
npx prisma generate

echo "Pushing database schema..."
npx prisma db push --accept-data-loss # Push schema to Postgres

if [ "$NODE_ENV" = "production" ]; then
  echo "Starting production server..."
  node server.js
else
  echo "Starting dev server..."
  npm run dev
fi
