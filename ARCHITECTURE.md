# Medical Platform Architecture

## Overview

The Arba Minch University Medical Platform is built as a RESTful API with WebSocket support for real-time communication. This document outlines the technical architecture and design decisions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
│         (React/Next.js - Not in this repo)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTPS/WSS
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  API Gateway Layer                           │
│  - Rate Limiting                                            │
│  - CORS Protection                                          │
│  - Input Validation                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼────────────┐    ┌─────────▼──────────┐
│  REST API      │    │  WebSocket (       │
│  (Express)     │    │  Socket.IO)        │
│                │    │                    │
│ - Auth         │    │ - Real-time Chat   │
│ - Doctors      │    │ - Typing Indicators│
│ - Chats        │    │ - Presence         │
│ - Ratings      │    │ - Notifications    │
│ - Symptom      │    └────────────────────┘
│   Checker      │
│ - Admin        │
└────┬───────────┘
     │
┌────▼──────────────────────────────────────────────────────┐
│                  Business Logic Layer                      │
│  - Authentication & Authorization (JWT)                   │
│  - Role-Based Access Control                              │
│  - Input Validation & Sanitization                        │
│  - Business Rules Enforcement                             │
└────┬──────────────────────────────────────────────────────┘
     │
┌────▼──────────────────────────────────────────────────────┐
│                  Data Access Layer                         │
│  - PostgreSQL Database                                     │
│  - Connection Pooling                                      │
│  - Prepared Statements (SQL Injection Prevention)          │
└────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend Framework
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **Socket.IO**: Real-time bidirectional communication

### Database
- **PostgreSQL**: Primary database for all relational data
- **pg**: PostgreSQL client for Node.js
- Connection pooling for performance

### Authentication & Security
- **JWT (jsonwebtoken)**: Token-based authentication
- **bcryptjs**: Password hashing
- **express-rate-limit**: Rate limiting to prevent abuse
- **validator**: Input validation
- **CORS**: Cross-Origin Resource Sharing protection

## Directory Structure

```
taxi-tracking-backend/
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   ├── rateLimiter.js       # Rate limiting configurations
│   └── validator.js         # Input validation middleware
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── doctors.js           # Doctor management endpoints
│   ├── chats.js             # Chat management endpoints
│   ├── ratings.js           # Rating system endpoints
│   ├── symptomChecker.js    # AI symptom checker endpoints
│   └── admin.js             # Admin panel endpoints
├── scripts/
│   └── verify.js            # Verification and health check script
├── database.js              # PostgreSQL connection configuration
├── server.js                # Main server entry point
├── socketHandler.js         # WebSocket event handlers
├── Schema.sql               # Database schema
├── package.json             # Dependencies and scripts
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
└── README.md                # Main documentation

```

## Database Schema Design

### Core Tables

1. **users**: All platform users (patients, doctors, students, admin)
2. **doctors**: Extended profiles for doctors
3. **chats**: Chat sessions between patients and doctors
4. **messages**: Individual chat messages
5. **ratings**: Doctor ratings and reviews
6. **symptom_checks**: AI symptom checker audit log
7. **medical_knowledge_base**: For future RAG implementation
8. **student_progress**: For future AI tutor
9. **audit_logs**: Security and compliance logging

### Relationships

```
users (1) ─────< (M) doctors
users (1) ─────< (M) chats [as patient]
users (1) ─────< (M) chats [as doctor]
chats (1) ─────< (M) messages
users (1) ─────< (M) ratings [as doctor]
users (1) ─────< (M) ratings [as patient]
chats (1) ───── (1) ratings
```

## API Design Principles

### RESTful Conventions
- Resources are nouns (e.g., `/api/doctors`, `/api/chats`)
- HTTP methods indicate actions (GET, POST, PUT, DELETE)
- Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Consistent error response format

### Authentication Flow
1. User registers/logs in → Receives JWT token
2. Client includes token in Authorization header: `Bearer <token>`
3. Server validates token on each request
4. Token contains user ID and role for authorization

### Authorization Model
- **Role-Based Access Control (RBAC)**
  - Patient: Can create chats, rate doctors, use symptom checker
  - Doctor: Can manage profile, respond to chats, update availability
  - Student: Can access AI tutor (future)
  - Admin: Full access to user management and system settings

## WebSocket Events

### Connection Management
- `user_join`: User connects with credentials
- `join_chat`: Join a specific chat room
- `disconnect`: Clean up connections

### Chat Events
- `send_message`: Send a chat message
- `new_message`: Receive a chat message
- `typing` / `stop_typing`: Typing indicators
- `mark_read`: Mark messages as read

### Doctor Events
- `update_availability`: Doctor changes availability status
- `doctor_availability_changed`: Broadcast availability change

## Security Measures

### Authentication Security
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens expire after 7 days
- Tokens signed with secret key (must be changed in production)

### Input Security
- All inputs validated against schema
- String inputs sanitized to prevent XSS
- Parameterized SQL queries to prevent injection
- File attachments (future) will be scanned

### Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Authentication: 5 requests per 15 minutes per IP
- Chat messages: 30 messages per minute per IP

### Database Security
- Connection pooling with limits
- Prepared statements for all queries
- Sensitive data encrypted at rest (future enhancement)
- Regular backups (operations responsibility)

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- GIN indexes for array/JSON columns
- Connection pooling (max 20 connections)
- Query optimization with proper joins

### Scalability
- Stateless API design (horizontal scaling possible)
- WebSocket rooms for targeted message delivery
- Rate limiting prevents resource exhaustion
- Database connection pooling

## Future Enhancements

### Phase 2
1. **File Upload System**
   - AWS S3 or compatible storage
   - Image upload for medical records
   - Secure file access with signed URLs

2. **Video Consultations**
   - Integration with Twilio/Agora
   - WebRTC for peer-to-peer video
   - Recording and playback (with consent)

3. **Payment Integration**
   - Stripe or local payment gateway
   - Consultation fee processing
   - Transaction history

### Phase 3
1. **AI/ML Integration**
   - Vector database (Pinecone/Weaviate)
   - RAG-based symptom checker
   - LLM integration (OpenAI/self-hosted)
   - AI tutor for medical students

2. **Advanced Features**
   - Appointment scheduling
   - Prescription generation
   - Lab test integration
   - Analytics dashboard

3. **Mobile Support**
   - Push notifications
   - React Native mobile app
   - Offline functionality

## Monitoring & Operations

### Recommended Monitoring
- **Application**: Sentry for error tracking
- **Infrastructure**: Prometheus + Grafana
- **Database**: PostgreSQL monitoring tools
- **Uptime**: Pingdom or similar

### Logging
- Request/response logging
- Error logging with stack traces
- Audit logs for sensitive operations
- User action tracking for compliance

### Backup Strategy
- Daily database backups
- Point-in-time recovery capability
- Encrypted backup storage
- Regular restore testing

## Compliance & Legal

### Data Protection
- User data encryption in transit (HTTPS)
- Database encryption at rest (recommended)
- Data retention policies
- Right to deletion (GDPR-style)

### Medical Compliance
- HIPAA-like considerations for Ethiopia
- Audit logging for all medical data access
- Consent management
- Disclaimer requirements for AI features

### Privacy
- Minimal data collection
- Clear privacy policy
- User consent for data usage
- Anonymous analytics where possible

## Development Workflow

### Local Development
1. Install dependencies: `npm install`
2. Configure `.env` file
3. Set up PostgreSQL database
4. Run schema: `psql -d medical_platform -f Schema.sql`
5. Start server: `npm run dev`

### Testing Strategy (Future)
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for critical flows
- Load testing for scalability

### Deployment
- Docker containerization
- CI/CD with GitHub Actions
- Staging environment for testing
- Blue-green deployment strategy

## Contact & Support

For technical questions or issues:
- Repository Issues: [GitHub Issues]
- Documentation: This file and README.md
- API Documentation: README.md

---

**Version**: 1.0.0 (MVP)  
**Last Updated**: October 2025  
**Status**: Initial Release
