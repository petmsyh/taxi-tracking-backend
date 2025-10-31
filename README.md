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

### Phase 2 Features (Implemented)

- **Appointment Scheduling System**
  - Create, view, update, and cancel appointments
  - Appointment conflict detection
  - Multiple appointment types (consultation, follow-up, emergency, checkup)
  - Appointment status management (pending, confirmed, completed, cancelled, no_show)
  - Date/time validation with future-only scheduling
  - Real-time appointment notifications

- **Prescription Management**
  - Doctors can create digital prescriptions
  - Structured medication information (name, dosage, frequency, duration)
  - Prescription history tracking
  - Link prescriptions to appointments or consultations
  - Prescription status management (active, expired, cancelled)
  - Patient prescription history

- **Medical Records Management**
  - Upload and manage medical documents
  - Support for multiple file types (lab results, X-rays, scans, reports)
  - File metadata tracking (size, type, uploader)
  - Patient and doctor access control
  - Link records to specific appointments
  - Medical record statistics

- **Notifications System**
  - Real-time notifications via WebSocket
  - Notification types (appointments, messages, prescriptions, ratings, system)
  - Mark as read/unread functionality
  - Notification priority levels
  - Clear read notifications
  - Notification statistics by type

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

### Appointment Endpoints

#### Create Appointment
```http
POST /api/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctor_id": "uuid",
  "appointment_date": "2025-11-15T10:00:00Z",
  "duration_minutes": 30,
  "appointment_type": "consultation",
  "reason": "Regular checkup"
}
```

#### Get Appointments
```http
GET /api/appointments?status=pending&from_date=2025-11-01&page=1&limit=20
Authorization: Bearer <token>
```

#### Get Appointment Details
```http
GET /api/appointments/:appointmentId
Authorization: Bearer <token>
```

#### Update Appointment (Reschedule)
```http
PUT /api/appointments/:appointmentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointment_date": "2025-11-16T14:00:00Z",
  "notes": "Rescheduled due to conflict"
}
```

#### Update Appointment Status
```http
PUT /api/appointments/:appointmentId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Confirmed by doctor"
}
```

#### Delete Appointment
```http
DELETE /api/appointments/:appointmentId
Authorization: Bearer <token>
```

### Prescription Endpoints

#### Create Prescription (Doctor only)
```http
POST /api/prescriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "diagnosis": "Common cold",
  "medications": [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "3 times daily",
      "duration": "5 days",
      "instructions": "Take after meals"
    }
  ],
  "additional_instructions": "Rest and drink plenty of fluids",
  "valid_until": "2025-12-31"
}
```

#### Get Prescriptions
```http
GET /api/prescriptions?status=active&page=1&limit=20
Authorization: Bearer <token>
```

#### Get Prescription Details
```http
GET /api/prescriptions/:prescriptionId
Authorization: Bearer <token>
```

#### Update Prescription Status (Doctor only)
```http
PUT /api/prescriptions/:prescriptionId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "cancelled"
}
```

### Notification Endpoints

#### Get Notifications
```http
GET /api/notifications?is_read=false&notification_type=appointment&page=1&limit=50
Authorization: Bearer <token>
```

#### Mark Notification as Read
```http
PUT /api/notifications/:notificationId/read
Authorization: Bearer <token>
```

#### Mark All Notifications as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

#### Delete Notification
```http
DELETE /api/notifications/:notificationId
Authorization: Bearer <token>
```

#### Get Notification Statistics
```http
GET /api/notifications/stats
Authorization: Bearer <token>
```

### Medical Records Endpoints

#### Upload Medical Record
```http
POST /api/medical-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "uuid",
  "record_type": "lab_result",
  "title": "Blood Test Results",
  "description": "Complete blood count",
  "file_name": "blood_test_2025.pdf",
  "file_size": 524288,
  "file_type": "application/pdf"
}
```

#### Get Medical Records
```http
GET /api/medical-records?patient_id=uuid&record_type=lab_result&page=1&limit=20
Authorization: Bearer <token>
```

#### Get Medical Record Details
```http
GET /api/medical-records/:recordId
Authorization: Bearer <token>
```

#### Update Medical Record
```http
PUT /api/medical-records/:recordId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Blood Test Results",
  "description": "Complete blood count - corrected"
}
```

#### Delete Medical Record
```http
DELETE /api/medical-records/:recordId
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
- `send_notification`: Send notification to specific user (system use)

### Server to Client

- `user_joined_chat`: Another user joined the chat
- `new_message`: New message received
- `message_error`: Error sending message
- `user_typing`: User is typing
- `user_stop_typing`: User stopped typing
- `messages_read`: Messages were marked as read
- `doctor_availability_changed`: Doctor availability changed
- `new_notification`: New notification received
- `appointment_updated`: Appointment status changed

## Database Schema

The database includes the following main tables:
- `users`: All platform users
- `doctors`: Extended doctor profiles
- `chats`: Chat sessions
- `messages`: Chat messages
- `ratings`: Doctor ratings
- `symptom_checks`: AI symptom checker logs
- `appointments`: Scheduled appointments between patients and doctors
- `prescriptions`: Digital prescriptions from doctors
- `medical_records`: Patient medical documents and files
- `notifications`: User notifications
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

### Phase 2 (Post-MVP) - ✅ Completed
- ✅ Appointment scheduling system
- ✅ Prescription generation and management
- ✅ Medical records and file management  
- ✅ Notifications system
- 🔜 Video consultations integration (Twilio/Agora)
- 🔜 Calendar sync for appointments
- 🔜 Payment integration (Stripe/local payment gateways)
- 🔜 AWS S3 for file storage
- 🔜 Multi-language support (Amharic + English)

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

### Environment Variables

Key environment variables (see `.env.example`):
- `DB_*`: Database connection settings
- `JWT_SECRET`: Secret for JWT signing (MUST change in production)
- `PORT`: Server port
- `CORS_ORIGIN`: Allowed frontend origin

## Contributing

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
