# Docker Setup Guide

This guide explains how to deploy the SLA application on a Linux server using Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Git (for version control)
- Linux server (Ubuntu 22.04 LTS recommended)

## Quick Start

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd sla
```

### 2. Configure Environment
```bash
# Copy example environment file
cp .env.example .env.production

# Edit with your production values
nano .env.production
```

**Important environment variables to set:**
- `POSTGRES_PASSWORD`: Strong password for database
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your production domain (e.g., https://app.yourdomain.com)

### 3. Deploy Application
```bash
# Make scripts executable
chmod +x scripts/deploy.sh
chmod +x scripts/update.sh

# Run deployment
./scripts/deploy.sh
```

### 4. Verify Deployment
```bash
# Check container status
docker-compose ps

# View application logs
docker-compose logs -f app

# Test database connection
docker-compose exec postgres psql -U postgres -d operations_control -c "SELECT version();"
```

## File Structure

```
.
├── Dockerfile                 # Multi-stage build for optimized image
├── docker-compose.yml        # Defines app and database services
├── .env.example              # Template for environment variables
├── .dockerignore             # Files to exclude from Docker build
├── scripts/
│   ├── deploy.sh             # Initial deployment script
│   └── update.sh             # Update/redeploy script
└── DOCKER_SETUP.md           # This file
```

## Common Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Just the database
docker-compose logs -f postgres
```

### Access Database
```bash
docker-compose exec postgres psql -U postgres -d operations_control
```

### Rebuild After Code Changes
```bash
./scripts/update.sh
```

### Manual Database Migration
```bash
docker-compose run --rm app npx prisma migrate deploy
```

### Database Backup
```bash
docker-compose exec postgres pg_dump -U postgres -d operations_control > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore
```bash
docker-compose exec -T postgres psql -U postgres -d operations_control < backup.sql
```

## Production Best Practices

### 1. Use Environment Variables
- Never commit `.env` files with sensitive data
- Use `.env.production` on server
- Rotate `NEXTAUTH_SECRET` periodically

### 2. Security
- Change default PostgreSQL password
- Use strong `NEXTAUTH_SECRET` (min 32 characters)
- Set `NEXTAUTH_URL` to your actual domain
- Consider using reverse proxy (nginx) with SSL/TLS

### 3. Backups
- Regular PostgreSQL backups
- Store backups off-server
- Test restore procedures

### 4. Monitoring
```bash
# Monitor container resource usage
docker stats

# Monitor application logs
docker-compose logs -f app | grep ERROR
```

### 5. Health Checks
The docker-compose configuration includes health checks for both app and database. Check status:
```bash
docker-compose ps
```

## Nginx Reverse Proxy (Optional)

If you want to use Nginx as a reverse proxy with SSL:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          SERVER_IP: ${{ secrets.SERVER_IP }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh -i ~/.ssh/deploy_key $SERVER_USER@$SERVER_IP './sla/scripts/update.sh'
```

## Troubleshooting

### Container fails to start
```bash
docker-compose logs app
# Check if port 3000 is already in use
sudo lsof -i :3000
```

### Database connection errors
```bash
# Verify database is running
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready
```

### Out of disk space
```bash
# Clean unused Docker resources
docker system prune -a

# Check disk usage
docker ps --format "{{.Names}}: {{.Size}}"
```

### Application slow
```bash
# Check resource limits
docker stats

# Increase memory if needed in docker-compose.yml
```

## Getting Server Credentials and Deployment

**About pulling changes and setting up on your server:**

I can prepare all deployment scripts and configuration, but I **cannot directly access external servers** to execute commands. Here are your options:

### Option 1: Manual Deployment (You execute commands on server)
1. SSH into your Linux server
2. Clone the repository
3. Copy and configure `.env.production`
4. Run `./scripts/deploy.sh`
5. Verify with `docker-compose ps`

### Option 2: CI/CD Pipeline (Automated)
Set up GitHub Actions or GitLab CI to automatically deploy when you push code:
- Add deployment credentials as secrets in your git provider
- Use the CI/CD example above
- Each push to `main` triggers automatic deployment

### Option 3: Deployment Tool Integration
Use tools like:
- **Dokku** - Simple self-hosted PaaS
- **Caprover** - Docker-based deployment platform
- **Fly.io** - Managed containers
- **Railway** - Infrastructure platform

If you provide server credentials (SSH details, IP, username), I can:
- ✅ Create deployment automation scripts (shell/bash)
- ✅ Generate CI/CD configuration
- ✅ Document step-by-step deployment process
- ❌ Cannot directly execute commands on your server

**To proceed:** Either execute the deployment scripts yourself on your server, or set up CI/CD with your git provider for automated deployments.

---

**Need help?** Check the logs or reply with specific deployment questions!
