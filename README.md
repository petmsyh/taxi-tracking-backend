# Arba Minch University Medical Consultation Platform - Backend

A comprehensive medical consultation platform backend for Arba Minch University that enables patients to find, chat with, and rate doctors. The platform also includes an AI-powered symptom checker and will support an AI tutor for medical students.

## Features

### MVP Features (Implemented)

- **User Authentication & Authorization**
  - Registration and login for patients, doctors, medical students, and admin
  - JWT-based authentication
  - Role-based access control (RBAC)

- **Doctor Management**
  - Doctor profiles with specialties, qualifications, and bio
  - Search and filter doctors by specialty, availability, location
  - Doctor ratings and reviews system
  - Availability management

- **Real-time Chat System**
  - WebSocket-based real-time communication between patients and doctors
  - Message persistence
  - Typing indicators
  - Read receipts
  - Chat history

- **Ratings & Reviews**
  - Patients can rate doctors (1-5 stars)
  - Review text with ratings
  - Rating statistics and analytics

- **AI Symptom Checker (Basic)**
  - Preliminary symptom assessment
  - Self-care suggestions
  - Red flag identification
  - Strong medical disclaimer
  - Audit logging for all symptom checks

- **Admin Dashboard**
  - User management
  - Doctor verification
  - System statistics
  - Audit logs

- **Security Features**
  - Rate limiting on all endpoints
  - Input validation and sanitization
  - Password hashing with bcrypt
  - CORS protection
  - SQL injection prevention

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: validator.js

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd taxi-tracking-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Create the database:
```bash
createdb medical_platform
```

5. Run the database schema:
```bash
psql -d medical_platform -f Schema.sql
```

6. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified in .env)

## API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "first_name": "John",
  "last_name": "Doe",
  "role": "patient|doctor|student",
  "phone": "+251912345678"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Doctor Endpoints

#### Get All Doctors
```http
GET /api/doctors?specialty=Cardiology&available=true&lat=6.0&lng=37.5&radius=50
```

#### Get Doctor Profile
```http
GET /api/doctors/:doctorId
```

#### Update Doctor Profile (Doctor only)
```http
PUT /api/doctors/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "specialties": ["Cardiology", "Internal Medicine"],
  "qualifications": ["MD", "FACC"],
  "bio": "Experienced cardiologist...",
  "consultation_fee": 500,
  "is_available": true
}
```

### Chat Endpoints

#### Create Chat Session
```http
POST /api/chats
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctor_id": "uuid"
}
```

#### Get User's Chats
```http
GET /api/chats?status=active
Authorization: Bearer <token>
```

#### Get Chat Details with Messages
```http
GET /api/chats/:chatId
Authorization: Bearer <token>
```

#### Update Chat Status
```http
PUT /api/chats/:chatId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

### Rating Endpoints

#### Submit Rating
```http
POST /api/ratings
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctor_id": "uuid",
  "chat_id": "uuid",
  "rating": 5,
  "review_text": "Excellent doctor!"
}
```

#### Get Doctor Ratings
```http
GET /api/ratings/doctor/:doctorId?page=1&limit=10
```

### Symptom Checker Endpoints

#### Check Symptoms
```http
POST /api/symptom-checker/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "symptoms": "I have fever and cough for 3 days"
}
```

#### Get Symptom Check History
```http
GET /api/symptom-checker/history
Authorization: Bearer <token>
```

### Admin Endpoints (Admin only)

#### Get All Users
```http
GET /api/admin/users?role=doctor&verified=true&page=1&limit=20
Authorization: Bearer <token>
```

#### Verify Doctor
```http
PUT /api/admin/doctors/:doctorId/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "verified": true
}
```

#### Get Statistics
```http
GET /api/admin/statistics
Authorization: Bearer <token>
```

#### Get Audit Logs
```http
GET /api/admin/audit-logs?page=1&limit=50
Authorization: Bearer <token>
```

## WebSocket Events

### Client to Server

- `user_join`: Join with userId and role
- `join_chat`: Join a specific chat room
- `send_message`: Send a message in a chat
- `typing`: Indicate typing in a chat
- `stop_typing`: Stop typing indication
- `mark_read`: Mark messages as read
- `update_availability`: Update doctor availability (doctors only)

### Server to Client

- `user_joined_chat`: Another user joined the chat
- `new_message`: New message received
- `message_error`: Error sending message
- `user_typing`: User is typing
- `user_stop_typing`: User stopped typing
- `messages_read`: Messages were marked as read
- `doctor_availability_changed`: Doctor availability changed

## Database Schema

The database includes the following main tables:
- `users`: All platform users
- `doctors`: Extended doctor profiles
- `chats`: Chat sessions
- `messages`: Chat messages
- `ratings`: Doctor ratings
- `symptom_checks`: AI symptom checker logs
- `medical_knowledge_base`: For RAG system (future)
- `student_progress`: For AI tutor (future)
- `audit_logs`: Security and compliance logs

## Security Considerations

1. **Authentication**: All protected endpoints require JWT authentication
2. **Rate Limiting**: Implemented on all routes to prevent abuse
3. **Input Validation**: All inputs are validated and sanitized
4. **Password Security**: Passwords are hashed using bcrypt
5. **CORS**: Configured to allow only trusted origins
6. **SQL Injection**: Using parameterized queries throughout
7. **Audit Logging**: All critical actions are logged

## Future Enhancements

### Phase 2 (Post-MVP)
- Video consultations integration (Twilio/Agora)
- Appointment scheduling with calendar sync
- Payment integration (Stripe/local payment gateways)
- Prescription generation and e-prescription
- File upload for medical images (AWS S3)
- Multi-language support (Amharic + English)

### Phase 3 (Advanced Features)
- Full RAG-based AI symptom checker with vector database (Pinecone/Weaviate)
- AI medical tutor for students
- Clinical decision support system
- Lab test recommendations
- Advanced analytics dashboard
- Mobile app (React Native)

## Development

### Running in Development Mode
```bash
npm run dev
```

This uses nodemon for auto-reloading on code changes.

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Environment Variables

Key environment variables (see `.env.example`):
- `DB_*`: Database connection settings
- `JWT_SECRET`: Secret for JWT signing (MUST change in production)
- `PORT`: Server port
- `CORS_ORIGIN`: Allowed frontend origin

## Deployment

### Docker Deployment

The easiest way to deploy is using Docker and Docker Compose:

1. **Build and run with Docker Compose**:
   ```bash
   # Copy and configure environment
   cp .env.example .env
   # Edit .env with production values
   
   # Start all services
   docker compose up -d
   
   # View logs
   docker compose logs -f api
   
   # Stop services
   docker compose down
   ```

2. **Build Docker image manually**:
   ```bash
   docker build -t medical-platform-api:latest .
   ```

3. **Run container**:
   ```bash
   docker run -d \
     --name medical-api \
     -p 5000:5000 \
     --env-file .env \
     medical-platform-api:latest
   ```

### Traditional Deployment

1. **Set up server** (Ubuntu/Debian):
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt-get install -y postgresql postgresql-contrib
   ```

2. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd taxi-tracking-backend
   npm ci --only=production
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Set up database**:
   ```bash
   sudo -u postgres createdb medical_platform
   sudo -u postgres psql -d medical_platform -f Schema.sql
   ```

4. **Run with PM2** (recommended for production):
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name medical-api
   pm2 save
   pm2 startup
   ```

### Health Checks

Monitor your deployment with the health check script:

```bash
# Basic health check
npm run health-check

# Custom URL and verbose output
node scripts/health-check.js --url https://api.example.com --verbose
```

### Production Checklist

Before deploying to production, ensure:

- [ ] `JWT_SECRET` is changed from default value
- [ ] Strong database password is set
- [ ] HTTPS/TLS is configured (use nginx/caddy as reverse proxy)
- [ ] `CORS_ORIGIN` is set to your frontend URL
- [ ] Database backups are configured
- [ ] Monitoring and logging are set up
- [ ] Firewall rules are configured
- [ ] Rate limiting is tested
- [ ] Health checks are configured in load balancer
- [ ] Environment variables are secured
- [ ] Security headers are configured (consider using helmet.js)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

Quick start:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Security

See [SECURITY.md](SECURITY.md) for security policy and vulnerability reporting.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

For issues and questions, please open an issue on the repository or contact the development team.

## Disclaimer

This platform provides AI-assisted preliminary assessments but is NOT a substitute for professional medical advice, diagnosis, or treatment. Users should always consult qualified healthcare professionals for medical concerns.
