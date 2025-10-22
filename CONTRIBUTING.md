# Contributing to Medical Platform Backend

Thank you for your interest in contributing to the Arba Minch University Medical Platform Backend!

## Code of Conduct

We expect all contributors to be respectful and professional. Harassment, discrimination, or inappropriate behavior will not be tolerated.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/taxi-tracking-backend.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit and push
7. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your local configuration

# Setup database
npm run setup-db

# Start development server
npm run dev
```

## Coding Standards

### JavaScript Style Guide

- Use ES6+ features
- Use `const` for immutable values, `let` for mutable ones
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use async/await instead of callbacks
- Follow ESLint rules

### Example
```javascript
// Good
const getUserById = async (userId) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};

// Avoid
function getUserById(userId, callback) {
  pool.query('SELECT * FROM users WHERE id = ' + userId, function(error, result) {
    if (error) {
      callback(error);
    } else {
      callback(null, result.rows[0]);
    }
  });
}
```

### File Structure

```
taxi-tracking-backend/
├── middleware/        # Express middleware
├── routes/           # API route handlers
├── utils/            # Utility functions
├── tests/            # Test files
├── scripts/          # Utility scripts
├── server.js         # Main entry point
├── database.js       # Database connection
└── socketHandler.js  # WebSocket handlers
```

## Making Changes

### 1. API Endpoints

When adding new endpoints:
- Follow RESTful conventions
- Add input validation
- Add authentication/authorization
- Add rate limiting if needed
- Add comprehensive error handling
- Document in README.md

Example:
```javascript
router.post('/new-endpoint',
  authenticate,
  authorize('role'),
  validateInput({
    field: { required: true, minLength: 1 }
  }),
  async (req, res) => {
    try {
      // Your logic here
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);
```

### 2. Database Changes

When modifying the database:
- Update Schema.sql
- Create migration script if needed
- Test with fresh database
- Document changes

### 3. WebSocket Events

When adding WebSocket events:
- Add to socketHandler.js
- Verify user authorization
- Document event structure
- Add to ARCHITECTURE.md

### 4. Tests

All new features must include tests:
```javascript
describe('Feature Name', () => {
  it('should do something', async () => {
    // Test code
  });
});
```

Run tests:
```bash
npm test
```

## Commit Messages

Follow conventional commit format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add password reset functionality

Implement password reset via email with secure tokens

Closes #123

---

fix(chat): prevent duplicate messages

Fixed race condition in message sending

---

docs(api): update authentication examples

Added JWT token refresh example
```

## Pull Request Process

1. **Create a branch** from `develop` (not `main`)
2. **Make your changes** with clear commits
3. **Run tests**: `npm test`
4. **Run linter**: `npm run lint:fix`
5. **Update documentation** if needed
6. **Create Pull Request** with:
   - Clear title
   - Description of changes
   - Related issue numbers
   - Screenshots (if UI changes)
   - Test coverage

### PR Template
```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Testing Guidelines

### Unit Tests
```javascript
// Test individual functions
describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
});
```

### Integration Tests
```javascript
// Test API endpoints
describe('POST /api/auth/login', () => {
  it('should login successfully', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);
    
    expect(response.body).toHaveProperty('token');
  });
});
```

### Test Coverage
Aim for:
- 80%+ line coverage
- 75%+ branch coverage
- All critical paths tested

## Security Guidelines

- Never commit secrets or credentials
- Always validate and sanitize user input
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Use HTTPS in production
- Keep dependencies updated
- Follow OWASP security best practices

## Documentation

Update documentation when:
- Adding new API endpoints
- Changing existing behavior
- Adding environment variables
- Modifying database schema
- Adding new features

## Questions or Issues?

- Create an issue for bugs or feature requests
- Use discussions for questions
- Join our development chat (if available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in the project

Thank you for contributing! 🎉
