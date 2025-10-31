# Changelog

All notable changes to the Arba Minch University Medical Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-31

### Added - Phase 2 Core Features

#### Appointment Scheduling System
- Complete appointment management with CRUD operations
- Appointment types: consultation, follow-up, emergency, checkup
- Status management: pending, confirmed, completed, cancelled, no_show
- Conflict detection and validation
- Future-only scheduling with date/time validation
- Rescheduling capabilities
- Real-time notifications for appointment updates
- Doctor and patient views with filtering
- API Endpoints: 6 new endpoints
  - `POST /api/appointments` - Create appointment
  - `GET /api/appointments` - List appointments with filters
  - `GET /api/appointments/:id` - Get appointment details
  - `PUT /api/appointments/:id` - Update/reschedule appointment
  - `PUT /api/appointments/:id/status` - Update appointment status
  - `DELETE /api/appointments/:id` - Delete appointment

#### Prescription Management System
- Digital prescription generation by doctors
- Structured medication information (name, dosage, frequency, duration, instructions)
- Link prescriptions to appointments or consultations
- Prescription status management (active, expired, cancelled)
- Patient prescription history
- Doctor prescription filtering
- API Endpoints: 4 new endpoints
  - `POST /api/prescriptions` - Create prescription (doctors only)
  - `GET /api/prescriptions` - List prescriptions
  - `GET /api/prescriptions/:id` - Get prescription details
  - `PUT /api/prescriptions/:id/status` - Update prescription status

#### Medical Records Management
- Patient medical document management
- Support for multiple record types: lab results, X-rays, scans, reports
- File metadata tracking (size, type, uploader)
- Patient and doctor access control
- Link records to specific appointments
- Medical record statistics
- S3-ready file path structure
- API Endpoints: 5 new endpoints
  - `POST /api/medical-records` - Upload medical record
  - `GET /api/medical-records` - List medical records
  - `GET /api/medical-records/:id` - Get record details
  - `PUT /api/medical-records/:id` - Update record metadata
  - `DELETE /api/medical-records/:id` - Delete record

#### Notifications System
- Real-time notification delivery via WebSocket
- Notification types: appointments, messages, prescriptions, ratings, system
- Priority levels: low, normal, high, urgent
- Read/unread status tracking
- Mark all as read functionality
- Clear read notifications
- Notification statistics by type
- Persistent storage with timestamps
- API Endpoints: 6 new endpoints
  - `GET /api/notifications` - List notifications with filters
  - `PUT /api/notifications/:id/read` - Mark as read
  - `PUT /api/notifications/read-all` - Mark all as read
  - `DELETE /api/notifications/:id` - Delete notification
  - `DELETE /api/notifications/clear-read` - Clear read notifications
  - `GET /api/notifications/stats` - Get notification statistics

#### Database Schema Updates
- Added `appointments` table with proper indexes
- Added `prescriptions` table with JSONB medication storage
- Added `medical_records` table with file metadata
- Added `notifications` table with priority and status fields
- Added foreign key relationships and constraints
- Added date/time constraints for appointments
- Added status enums for data integrity

#### WebSocket Enhancements
- Added `send_notification` event for real-time notifications
- Added `new_notification` event broadcast
- Added `appointment_updated` event for appointment changes
- Enhanced socket handler with notification helper functions

#### Middleware Updates
- Enhanced authentication middleware with `req.userId` and `req.userRole` aliases
- Added `requireRole` helper function for role-based access control
- Maintained backward compatibility with existing code

### Changed

#### Documentation
- Updated README.md with Phase 2 feature descriptions
- Updated README.md with 19 new API endpoint documentation
- Updated IMPLEMENTATION_SUMMARY.md with metrics
- Updated database schema section
- Updated WebSocket events documentation

#### API Statistics
- Total endpoints increased from 17 to 36 (+19)
- Total database tables increased from 9 to 13 (+4)
- Total WebSocket events increased from 12 to 14 (+2)
- Total route modules increased from 6 to 10 (+4)

### Security

#### CodeQL Scan Results
- 3 low-severity alerts reviewed and documented
- All alerts determined to be false positives
- Added security documentation comments
- Created SECURITY_SUMMARY.md with detailed analysis

#### Security Measures
- All new endpoints protected by authentication middleware
- Proper role-based authorization checks
- UUID identifiers prevent enumeration attacks
- Parameterized SQL queries prevent injection
- Audit logging for sensitive operations

### Technical Details

#### Lines of Code
- Added ~3,000 lines of functional code
- Total codebase: ~5,500 lines

#### Files Added
- `routes/appointments.js` (561 lines)
- `routes/prescriptions.js` (355 lines)
- `routes/notifications.js` (197 lines)
- `routes/medicalRecords.js` (439 lines)
- `SECURITY_SUMMARY.md` (security analysis)
- `CHANGELOG.md` (this file)

#### Files Modified
- `server.js` - Added new route imports and registrations
- `socketHandler.js` - Added notification events
- `middleware/auth.js` - Added requireRole and user aliases
- `Schema.sql` - Added 4 new tables with 80+ lines
- `scripts/verify.js` - Added new routes to verification
- `README.md` - Comprehensive API documentation
- `IMPLEMENTATION_SUMMARY.md` - Updated metrics

### Performance

#### Database Optimization
- Added indexes on frequently queried columns
- GIN indexes for JSONB fields (medications)
- Optimized queries with proper joins
- Connection pooling maintained

#### Scalability
- Stateless API design maintained
- WebSocket rooms for targeted delivery
- Pagination on all list endpoints
- Efficient query filtering

## [1.0.0] - 2025-10-22

### Added - MVP Features

#### User Authentication & Authorization
- JWT-based authentication
- Role-based access control (Patient, Doctor, Student, Admin)
- Password hashing with bcrypt
- Rate limiting on authentication endpoints

#### Doctor Management
- Doctor profiles with specialties and qualifications
- Location-based search
- Doctor ratings and reviews
- Availability management

#### Real-time Chat System
- WebSocket-based communication (Socket.IO)
- Message persistence
- Typing indicators and read receipts
- Chat history and status management

#### Ratings & Reviews
- 5-star rating system
- Review text with ratings
- Rating statistics and analytics

#### AI Symptom Checker (Basic)
- Preliminary symptom assessment
- Audit logging for compliance
- Patient symptom check history

#### Admin Dashboard
- User management
- Doctor verification
- System statistics
- Audit logs

#### Database Schema
- 9 core tables
- Proper foreign key relationships
- Indexes for performance
- GIN indexes for array/JSON fields

#### Security Features
- Rate limiting on all endpoints
- Input validation and sanitization
- Password hashing with bcrypt
- CORS protection
- SQL injection prevention

#### Documentation
- README.md with complete API documentation
- ARCHITECTURE.md with system design
- IMPLEMENTATION_SUMMARY.md
- .env.example for configuration

### API Endpoints (17 total)
- Authentication: 2 endpoints
- Doctors: 3 endpoints
- Chats: 4 endpoints
- Ratings: 2 endpoints
- Symptom Checker: 2 endpoints
- Admin: 4 endpoints

### WebSocket Events (12 total)
- Chat management
- Real-time messaging
- Typing indicators
- Read receipts
- Doctor availability

---

## Release Notes

### Version 2.0.0 - Phase 2 Complete

This major release adds comprehensive appointment scheduling, prescription management, medical records, and notifications systems. The platform now supports the complete patient-doctor workflow from scheduling appointments to receiving prescriptions and managing medical records.

**Upgrade Notes:**
- Database migration required: Run updated `Schema.sql` to add new tables
- No breaking changes to existing API endpoints
- New environment variables: None required
- Backward compatible with version 1.0.0

**Breaking Changes:** None

**Deprecations:** None

### Version 1.0.0 - MVP Release

Initial release with core medical consultation platform features including authentication, doctor management, real-time chat, ratings, symptom checker, and admin dashboard.

---

## Future Releases

### Version 2.1.0 (Planned)
- Video consultations integration (Twilio/Agora)
- Calendar sync for appointments
- Payment integration (Stripe)
- AWS S3 for file storage

### Version 2.2.0 (Planned)
- Multi-language support (Amharic + English)
- Email notifications
- SMS reminders

### Version 3.0.0 (Planned)
- RAG-based AI symptom checker
- AI medical tutor for students
- Clinical decision support system
- Advanced analytics dashboard
- Mobile app (React Native)
