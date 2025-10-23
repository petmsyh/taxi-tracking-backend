# Contributing to Medical Consultation Platform

First off, thank you for considering contributing to the Arba Minch University Medical Consultation Platform! It's people like you that help make this platform better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to create a welcoming and inclusive environment. Be respectful, considerate, and collaborative.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if applicable**
- **Note your environment**: OS, Node.js version, PostgreSQL version

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternative solutions you've considered**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Write clear commit messages**
6. **Submit a pull request**

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/taxi-tracking-backend.git
   cd taxi-tracking-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up database:
   ```bash
   createdb medical_platform
   psql -d medical_platform -f Schema.sql
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Coding Standards

### JavaScript Style Guide

- Use **semicolons**
- Use **const** and **let**, avoid **var**
- Use **async/await** over promises when possible
- Use **arrow functions** for callbacks
- Use **template literals** for string interpolation
- Keep functions small and focused (single responsibility)
- Use meaningful variable and function names

### Code Organization

- **Routes**: Place API route handlers in `routes/`
- **Middleware**: Place reusable middleware in `middleware/`
- **Database**: Database queries should use parameterized queries
- **Validation**: Use the validation middleware for input validation
- **Error Handling**: Always use try-catch blocks for async operations

### Example Code Style

```javascript
// Good
const getUserById = async (userId) => {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

// Bad
function getUserById(userId) {
  return db.query('SELECT * FROM users WHERE id = $1', [userId])
    .then(result => result.rows[0])
    .catch(err => console.error(err));
}
```

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Examples:
```
Add patient appointment scheduling endpoint
Fix authentication token expiration bug
Update doctor profile validation rules
```

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage of business logic
- Test both success and error cases

### Documentation

- Update README.md if you change functionality
- Add JSDoc comments for public functions
- Update API documentation for new endpoints
- Include example requests and responses

## API Development Guidelines

### RESTful Conventions

- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Use proper status codes (200, 201, 400, 401, 404, 500)
- Return consistent JSON responses
- Include proper error messages

### Security Considerations

- **Always validate and sanitize input**
- **Use parameterized queries** to prevent SQL injection
- **Check authentication and authorization**
- **Rate limit sensitive endpoints**
- **Never expose sensitive data** in error messages
- **Log security-relevant events** to audit logs

### Example API Endpoint

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateInput } = require('../middleware/validator');
const db = require('../database');

router.post('/endpoint',
  authenticate,
  validateInput({
    field: { required: true, minLength: 3 }
  }),
  async (req, res) => {
    try {
      const { field } = req.body;
      const userId = req.user.id;

      // Business logic here
      const result = await db.query(
        'INSERT INTO table (field, user_id) VALUES ($1, $2) RETURNING *',
        [field, userId]
      );

      res.status(201).json({
        message: 'Success',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
```

## Database Changes

- Always update `Schema.sql` if you modify the database schema
- Use migrations for schema changes
- Test schema changes with sample data
- Document any new tables or columns

## WebSocket Development

- Handle connection errors gracefully
- Validate all socket events
- Use rooms appropriately for chat isolation
- Clean up listeners on disconnect
- Rate limit socket events

## Review Process

1. All submissions require review
2. Reviewers will check for:
   - Code quality and style
   - Security considerations
   - Test coverage
   - Documentation updates
   - Performance implications

3. Address review feedback promptly
4. Once approved, maintainers will merge your PR

## Questions?

Don't hesitate to ask questions! You can:
- Open an issue with the "question" label
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions to open source, large or small, make projects like this possible. Thank you for taking the time to contribute!
