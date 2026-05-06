# Project Notes

This file consolidates deployment and operational notes for the SLA application.

## Overview

- Stack: Next.js 14, Prisma, PostgreSQL, NextAuth
- Runtime: Docker Compose for production deployment
- Scripts: `scripts/deploy.sh` and `scripts/update.sh`

## Deployment (Server)

1. SSH into server and clone repository.
2. Copy environment template and set production values.
3. Run deploy script.
4. Verify containers and logs.

```bash
ssh user@your-server-ip
git clone https://github.com/yourusername/sla.git
cd sla
cp .env.example .env.production
nano .env.production
chmod +x scripts/deploy.sh scripts/update.sh
./scripts/deploy.sh
```

## Required Environment Variables

Set these in `.env.production`:

- `POSTGRES_PASSWORD`
- `POSTGRES_USER` (typically `postgres`)
- `POSTGRES_DB` (typically `operations_control`)
- `NEXTAUTH_SECRET` (strong random secret)
- `NEXTAUTH_URL` (production domain)
- `APP_PORT` (default `3000`)

## Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# App logs
docker-compose logs -f app

# All logs
docker-compose logs -f

# DB console
docker-compose exec postgres psql -U postgres -d operations_control

# Run prisma migrate in container
docker-compose run --rm app npx prisma migrate deploy
```

## Verification Checklist

```bash
# Containers
docker-compose ps

# App endpoint
curl http://localhost:3000

# DB health
docker-compose exec postgres pg_isready
```

## Update Flow

```bash
./scripts/update.sh
```

Use this after pulling latest code on the server.

## Backup and Restore

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres -d operations_control > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres -d operations_control < backup.sql
```

## Troubleshooting

### App fails to start

```bash
docker-compose logs app
sudo lsof -i :3000
```

### Database errors

```bash
docker-compose logs postgres
docker-compose exec postgres pg_isready
```

### Disk space issues

```bash
docker system df
docker system prune -a --volumes
```

## Security and Operations Recommendations

- Use strong credentials and rotate secrets regularly.
- Do not commit real `.env` files.
- Use HTTPS in production with reverse proxy.
- Back up database regularly and test restores.
- Monitor logs and container health.
