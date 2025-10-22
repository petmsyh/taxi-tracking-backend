# Deployment Guide

This guide covers deploying the Medical Platform Backend to various environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- Node.js 18+ or Docker
- PostgreSQL 12+
- Git

## Local Development

### 1. Clone the Repository
```bash
git clone <repository-url>
cd taxi-tracking-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Setup Database
```bash
# Create database and run schema
npm run setup-db
```

### 5. Start Development Server
```bash
npm run dev
```

The server will start on http://localhost:5000

## Docker Deployment

### Quick Start with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker Build
```bash
# Build image
docker build -t medical-platform-api:latest .

# Run container
docker run -d \
  --name medical-api \
  -p 5000:5000 \
  -e DB_HOST=your-db-host \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=medical_platform \
  -e JWT_SECRET=your-secret-key \
  medical-platform-api:latest
```

## Production Deployment

### Option 1: Traditional Server (VPS/Dedicated)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

#### 2. Deploy Application
```bash
# Clone repository
git clone <repository-url> /var/www/medical-platform
cd /var/www/medical-platform

# Install dependencies
npm ci --production

# Configure environment
cp .env.example .env
# Edit .env with production values

# Setup database
npm run setup-db

# Start with PM2
pm2 start server.js --name medical-api
pm2 save
pm2 startup
```

#### 3. Setup Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name api.medical.amu.edu.et;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4. Setup SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.medical.amu.edu.et
```

### Option 2: Cloud Platforms

#### Heroku
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create medical-platform-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your-secret-key
heroku config:set CORS_ORIGIN=https://your-frontend.com

# Deploy
git push heroku main

# Run database setup
heroku run npm run setup-db
```

#### AWS (EC2 + RDS)
1. Launch EC2 instance (Ubuntu 20.04+)
2. Create RDS PostgreSQL instance
3. Configure security groups
4. Follow traditional server setup above
5. Use RDS connection details in .env

#### DigitalOcean App Platform
```yaml
# app.yaml
name: medical-platform-api
services:
- name: api
  github:
    repo: your-repo
    branch: main
  run_command: npm start
  environment_slug: node-js
  envs:
  - key: DB_HOST
    value: ${db.HOSTNAME}
  - key: DB_PORT
    value: ${db.PORT}
  - key: DB_NAME
    value: ${db.DATABASE}
  - key: DB_USER
    value: ${db.USERNAME}
  - key: DB_PASSWORD
    value: ${db.PASSWORD}
  - key: JWT_SECRET
    value: your-secret-key
    type: SECRET
databases:
- name: db
  engine: PG
  version: "15"
```

## Environment Variables

### Required Variables
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=medical_platform
DB_PASSWORD=your-secure-password
DB_PORT=5432

JWT_SECRET=your-very-secure-secret-key-at-least-32-chars

PORT=5000
NODE_ENV=production

CORS_ORIGIN=https://your-frontend-domain.com
```

### Optional Variables
```env
LOG_LEVEL=info
```

## Database Setup

### Manual Setup
```bash
# Create database
createdb medical_platform

# Run schema
psql -d medical_platform -f Schema.sql

# Or use the setup script
npm run setup-db
```

### Backup & Restore
```bash
# Backup
pg_dump -U postgres -d medical_platform > backup.sql

# Restore
psql -U postgres -d medical_platform < backup.sql
```

### Database Migrations
For future schema changes, create migration files:
```sql
-- migrations/001_add_feature.sql
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check API health
curl http://localhost:5000/health

# Expected response
{"status":"ok","service":"Arba Minch University Medical Platform","timestamp":"..."}
```

### Log Management
```bash
# View PM2 logs
pm2 logs medical-api

# View Docker logs
docker-compose logs -f api

# Log rotation (PM2)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Database Maintenance
```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Performance Monitoring
```bash
# Install monitoring tools
npm install -g clinic

# Profile your application
clinic doctor -- node server.js
```

### Security Updates
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Update only security fixes
npm audit fix
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -U postgres -h localhost -d medical_platform

# Check PostgreSQL is running
sudo systemctl status postgresql
```

#### Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server.js

# Or with PM2
pm2 start server.js --node-args="--max-old-space-size=4096"
```

## Scaling

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy, or cloud load balancers)
- Ensure stateless API design
- Use Redis for session storage if needed
- Configure Socket.IO with Redis adapter for multi-instance support

### Database Scaling
- Enable connection pooling (already configured)
- Add read replicas for read-heavy operations
- Implement caching layer (Redis)
- Regular index optimization

## Backup Strategy

### Automated Backups
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/medical-platform"
mkdir -p $BACKUP_DIR
pg_dump -U postgres medical_platform | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### Add to crontab
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## Support

For issues or questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation in README.md

## Checklist for Production

- [ ] Change JWT_SECRET to a strong random value
- [ ] Update database password
- [ ] Configure CORS_ORIGIN to your frontend domain
- [ ] Enable SSL/HTTPS
- [ ] Setup automated backups
- [ ] Configure monitoring and alerting
- [ ] Setup log rotation
- [ ] Test health check endpoints
- [ ] Configure firewall rules
- [ ] Setup rate limiting (already configured)
- [ ] Review security settings
- [ ] Document incident response procedures
- [ ] Setup staging environment
- [ ] Test disaster recovery procedures
