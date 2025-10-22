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

4. Set up the database:
```bash
# Option 1: Automated setup (recommended)
npm run setup-db

# Option 2: Manual setup
createdb medical_platform
psql -d medical_platform -f Schema.sql
```

5. Start the server:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified in .env)

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# Start all services (API + PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

Access the API at http://localhost:5000

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

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database Management
```bash
# Setup database with default admin user
npm run setup-db

# Verify system configuration
npm run verify
```

### Environment Variables

Key environment variables (see `.env.example`):
- `DB_*`: Database connection settings
- `JWT_SECRET`: Secret for JWT signing (MUST change in production)
- `PORT`: Server port
- `CORS_ORIGIN`: Allowed frontend origin

## Testing

The project includes comprehensive tests:
- Health check tests
- Authentication API tests
- More tests to be added

Import the `postman_collection.json` into Postman for API testing.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions including:
- Local deployment
- Docker deployment
- Cloud platform deployment (Heroku, AWS, DigitalOcean)
- Production configuration
- Monitoring and maintenance

## Docker Support

Build and run with Docker:
```bash
# Build image
docker build -t medical-platform-api .

# Run container
docker run -p 5000:5000 \
  -e DB_HOST=your-db-host \
  -e JWT_SECRET=your-secret \
  medical-platform-api
```

Or use docker-compose for local development:
```bash
docker-compose up -d
```

## CI/CD

The project includes a GitHub Actions workflow that:
- Runs tests on every push/PR
- Performs security audits
- Builds Docker images
- Runs linting checks

See `.github/workflows/ci.yml` for details.

## Project Structure

```
taxi-tracking-backend/
├── .github/          # GitHub Actions workflows
├── middleware/       # Express middleware
├── routes/          # API route handlers
├── scripts/         # Utility scripts
├── tests/           # Test files
├── utils/           # Utility functions
├── database.js      # Database connection
├── server.js        # Main entry point
└── socketHandler.js # WebSocket handlers
```

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Coding standards
- Pull request process
- Testing guidelines

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on the repository or contact the development team.

## Disclaimer

This platform provides AI-assisted preliminary assessments but is NOT a substitute for professional medical advice, diagnosis, or treatment. Users should always consult qualified healthcare professionals for medical concerns.
