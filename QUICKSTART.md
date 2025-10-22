# Quick Start Guide

Get the Medical Platform Backend up and running in minutes!

## Prerequisites

- Node.js 18+ or Docker
- PostgreSQL 12+ (if not using Docker)

## Option 1: Docker (Recommended for Testing)

The fastest way to get started:

```bash
# Start everything with Docker Compose
docker-compose up -d

# Wait about 30 seconds for services to initialize

# Check if it's running
curl http://localhost:5000/health
```

That's it! The API is now running at http://localhost:5000 with a PostgreSQL database.

**Default Admin Credentials:**
- Email: admin@medical.amu.edu.et
- Password: admin123 (⚠️ Change this immediately!)

## Option 2: Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env if needed (defaults work for local PostgreSQL)
```

### 3. Setup Database
```bash
npm run setup-db
```

This will:
- Create the database
- Run the schema
- Create a default admin user

### 4. Start the Server
```bash
npm run dev
```

The API will be available at http://localhost:5000

## Testing the API

### 1. Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "Arba Minch University Medical Platform",
  "timestamp": "..."
}
```

### 2. Register a Patient
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Test1234!",
    "first_name": "John",
    "last_name": "Doe",
    "role": "patient",
    "phone": "+251912345678"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Test1234!"
  }'
```

Save the `token` from the response for authenticated requests.

### 4. Get Doctors
```bash
curl http://localhost:5000/api/doctors
```

## Using Postman

1. Import `postman_collection.json` into Postman
2. Set the `baseUrl` variable to `http://localhost:5000`
3. Register/Login to get a token
4. The token will be automatically saved for authenticated requests

## Next Steps

- Read [README.md](README.md) for API documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute

## Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env
PORT=5001
```

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Or with Docker
docker ps | grep postgres
```

### Permission Denied on Scripts
```bash
chmod +x scripts/*.js
```

## Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Setup database
npm run setup-db

# Verify setup
npm run verify
```

## Default Admin Access

After running `npm run setup-db`, you'll have:
- Email: admin@medical.amu.edu.et
- Password: admin123

⚠️ **Important:** Change this password immediately in production!

## Support

Having issues? Check:
1. [README.md](README.md) - Full documentation
2. [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
3. GitHub Issues - Report bugs
4. [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

Happy coding! 🚀
