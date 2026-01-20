# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email your findings to [security@example.com](mailto:security@example.com)
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will assess the vulnerability and determine its severity
- **Updates**: We will keep you informed of our progress
- **Resolution**: We aim to resolve critical vulnerabilities within 7 days
- **Credit**: With your permission, we will credit you in our release notes

### Scope

The following are in scope for security reports:

- Authentication and authorization bypasses
- Data exposure vulnerabilities
- Injection attacks (SQL, XSS, etc.)
- API security issues
- Cryptographic weaknesses
- OAuth flow vulnerabilities

### Out of Scope

- Denial of Service (DoS) attacks
- Social engineering
- Physical security issues
- Issues in third-party dependencies (report these to the respective maintainers)

## Security Best Practices

When deploying this application:

1. **Environment Variables**: Never commit `.env.local` or any file containing secrets
2. **Encryption Key**: Generate a unique 64-character hex encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **API Keys**: Rotate API keys regularly and use the minimum required permissions
4. **HTTPS**: Always deploy with HTTPS in production
5. **Monitoring**: Enable logging and monitor for suspicious activity

## Security Features

This application includes:

- Clerk authentication with secure session management
- Encrypted OAuth token storage
- CSRF protection via state parameters
- Security headers (X-Frame-Options, CSP, HSTS, etc.)
- Input validation using Zod schemas
- Sanitized error logging to prevent credential leaks
