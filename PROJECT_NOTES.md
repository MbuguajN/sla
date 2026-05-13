# Project Notes

This file consolidates deployment and operational notes for the SLA application.

## Overview

- Stack: Next.js 14, Prisma, PostgreSQL, NextAuth
- Runtime: systemd service behind FastPanel/Nginx
- Scripts: `scripts/deploy.sh` and `scripts/update.sh` remain available, but the primary production path is systemd

## Deployment (Server)

1. SSH into server and clone repository.
2. Create `.env.production` manually and set production values.
3. Install dependencies, generate Prisma client, run migrations, and build.
4. Start the app with systemd and proxy it through FastPanel.

```bash
ssh user@your-server-ip
git clone https://github.com/yourusername/sla.git
cd sla
touch .env.production
nano .env.production
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
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

## systemd Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable sla
sudo systemctl start sla
sudo systemctl status sla
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
git pull
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart sla
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
