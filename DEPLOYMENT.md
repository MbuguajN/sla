# Server Deployment - Quick Reference

## What I Can Do

✅ **I can help with:**
- Creating Docker configurations and scripts (done: Dockerfile, docker-compose.yml)
- Writing deployment automation scripts (done: scripts/deploy.sh, scripts/update.sh)
- Setting up CI/CD pipelines (GitHub Actions, GitLab CI)
- Troubleshooting Docker/deployment issues
- Creating environment configuration templates
- Writing comprehensive deployment guides

## What I Cannot Do

❌ **I cannot:**
- SSH into your server directly
- Execute commands on external servers
- Access your server infrastructure
- Pull code repositories on your behalf
- Run deployment scripts remotely

## How to Deploy to Your Server

### Step 1: Prepare Your Server (SSH In Manually)

```bash
# SSH into your Linux server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Clone your repository
git clone https://github.com/yourusername/sla.git
cd sla
```

### Step 2: Configure Environment

```bash
# Copy your production environment file to the server
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Set these values:**
```bash
POSTGRES_PASSWORD=your-strong-password-here
POSTGRES_USER=postgres
POSTGRES_DB=operations_control
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://yourdomain.com
APP_PORT=3000
```

### Step 3: Deploy

```bash
# Make scripts executable
chmod +x scripts/deploy.sh
chmod +x scripts/update.sh

# Run initial deployment (installs Docker if needed)
./scripts/deploy.sh

# This will:
# - Install Docker and Docker Compose if missing
# - Build the application image
# - Start PostgreSQL and application containers
# - Initialize the database
# - Verify everything is running
```

### Step 4: Verify It's Working

```bash
# Check container status
docker-compose ps

# View application logs
docker-compose logs -f app

# Test the application
curl http://localhost:3000

# Access application from browser
# http://your-server-ip:3000 (or https://yourdomain.com if you set up reverse proxy)
```

## Example Deployment Timeline

1. **Week 1:** SSH into server, clone repo, run deploy.sh
2. **Ongoing:** For updates, run `./scripts/update.sh` on server
3. **Optional:** Set up CI/CD so updates deploy automatically on git push

## Option 1: Manual Deployment (Simplest)

You on your local machine → SSH into server → Run deployment script

**Time to deploy:** ~10-15 minutes on first run, ~2-3 minutes for updates

## Option 2: CI/CD Automation (Recommended)

Your git push → GitHub Actions → Automatically runs update.sh on server

**Setup time:** ~20 minutes
**Time to deploy after:** Instant when you push code

### CI/CD Example (GitHub Actions)

Create `.github/workflows/deploy.yml`:

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
          ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'cd ~/sla && git pull && ./scripts/update.sh'
```

**To set up CI/CD:**
1. Generate SSH key: `ssh-keygen -t rsa -b 4096`
2. Add public key to server's `~/.ssh/authorized_keys`
3. Add secrets to GitHub:
   - `DEPLOY_KEY` = private SSH key content
   - `SERVER_IP` = your server IP
   - `SERVER_USER` = your Linux username

## Accessing Your Application

### Without Reverse Proxy (Direct Access)
```
http://your-server-ip:3000
```

### With Nginx Reverse Proxy (Recommended)
```
https://yourdomain.com
```

*See DOCKER_SETUP.md for Nginx configuration*

## Managing Your Deployment

### View Logs
```bash
docker-compose logs -f app
```

### Restart Application
```bash
docker-compose restart app
```

### Stop Everything
```bash
docker-compose down
```

### Backup Database
```bash
docker-compose exec postgres pg_dump -U postgres -d operations_control > backup.sql
```

### Access Database Console
```bash
docker-compose exec postgres psql -U postgres -d operations_control
```

## Troubleshooting

### Application won't start
```bash
# Check logs
docker-compose logs app

# Verify environment variables are set
cat .env.production | grep -v "^#"

# Check if port 3000 is in use
sudo lsof -i :3000
```

### Database connection error
```bash
# Verify database is running
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready
```

### Running out of disk space
```bash
# Check Docker disk usage
docker system df

# Clean up unused images/containers
docker system prune -a --volumes
```

## Production Recommendations

1. **Use strong passwords** - At least 16 characters, random
2. **Rotate secrets** - Change NEXTAUTH_SECRET monthly
3. **Set up SSL/TLS** - Use reverse proxy with certificates
4. **Monitor logs** - Set up log aggregation or alerts
5. **Regular backups** - Backup database daily, store off-server
6. **Keep updated** - Run updates regularly
7. **Monitor health** - Use container health checks (built in)

## Need Help?

If you hit issues with deployment:
1. Check logs: `docker-compose logs -f`
2. Verify environment: `cat .env.production`
3. Test database: `docker-compose exec postgres pg_isready`
4. Restart containers: `docker-compose restart`

---

**Remember:** I cannot access your server directly, but I can help troubleshoot and fix any issues you encounter. Provide logs or error messages and I'll help diagnose!
