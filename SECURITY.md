# Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an email to the development team. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

## Known Security Considerations

### Validator.js Moderate Vulnerability (GHSA-9965-vmph-33xx)

**Status**: Acknowledged - Not Exploitable in This Codebase

The validator.js library (v13.15.15) has a known URL validation bypass vulnerability in its `isURL` function. However, this project:

- **Does NOT use** the `isURL` function
- Only uses `isEmail`, `isUUID`, and `escape` functions from validator.js
- Is therefore **NOT vulnerable** to this specific issue

The vulnerability will be resolved when a patched version of validator.js is released. We will update the dependency at that time.

### Security Features Implemented

1. **Authentication & Authorization**
   - JWT-based authentication with secure token generation
   - Role-based access control (RBAC)
   - Password hashing with bcrypt (10 rounds)
   - Token expiration (7 days)

2. **Input Validation & Sanitization**
   - Input validation middleware on all endpoints
   - XSS prevention through input sanitization
   - SQL injection prevention using parameterized queries
   - UUID validation for all ID parameters

3. **Rate Limiting**
   - General API: 100 requests per 15 minutes
   - Authentication: 5 requests per 15 minutes
   - Chat messages: 30 requests per minute

4. **CORS Protection**
   - Configured to allow only trusted origins
   - Credentials support properly configured

5. **Audit Logging**
   - All critical actions logged
   - Symptom checks logged for compliance
   - Admin actions tracked

6. **Database Security**
   - Connection pooling with proper error handling
   - Parameterized queries throughout
   - No sensitive data in error messages

## Security Best Practices

### For Deployment

1. **Environment Variables**
   - Change `JWT_SECRET` to a strong, random value
   - Use strong database passwords
   - Never commit `.env` files to version control

2. **HTTPS**
   - Always use HTTPS in production
   - Enable secure WebSocket (WSS) for Socket.IO

3. **Database**
   - Use database user with minimal required permissions
   - Enable SSL for database connections in production
   - Regular backups with encryption

4. **Monitoring**
   - Monitor audit logs regularly
   - Set up alerts for suspicious activities
   - Track failed authentication attempts

5. **Updates**
   - Keep all dependencies up to date
   - Subscribe to security advisories
   - Run `npm audit` regularly

## Security Checklist for Production

- [ ] JWT_SECRET changed from default
- [ ] Strong database password set
- [ ] HTTPS/TLS enabled
- [ ] CORS_ORIGIN properly configured
- [ ] Database SSL connection enabled
- [ ] Audit log monitoring set up
- [ ] Regular backup schedule configured
- [ ] Security headers configured (use helmet.js)
- [ ] Rate limiting verified
- [ ] Error messages sanitized (no stack traces in production)

## Contact

For security concerns, please contact: [Insert Security Contact Email]

## Acknowledgments

We appreciate the security research community's efforts in making the web safer for everyone.
