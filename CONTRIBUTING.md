# Contributing to MCP Hub Toolkit

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env.local` and configure required variables
5. Start development server: `npm run dev`

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Commit Messages

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Maintenance tasks

## Code Requirements

### Before Submitting

1. **Run tests**: `npm run test:run`
2. **Run linter**: `npm run lint`
3. **Type check**: `npx tsc --noEmit`
4. **Build check**: `npm run build`

### Code Style

- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Add tests for new functionality
- Keep functions focused and small
- Use meaningful variable and function names

### Test Requirements

- All new features must include tests
- Bug fixes should include regression tests
- Maintain or improve code coverage
- Tests should be deterministic and not flaky

## Pull Request Process

1. **Create a PR** with a clear title and description
2. **Link related issues** using GitHub keywords (Fixes #123)
3. **Wait for CI** to pass all checks
4. **Request review** from maintainers
5. **Address feedback** promptly

### PR Checklist

- [ ] Tests pass locally
- [ ] Linter passes with no warnings
- [ ] TypeScript compiles without errors
- [ ] Build succeeds
- [ ] Documentation updated if needed
- [ ] No sensitive data in commits

## Security Review

Changes affecting these areas require additional security review:

- Authentication/authorization logic
- OAuth flows and token handling
- Encryption/decryption code
- API key management
- Input validation
- Error handling that may expose sensitive data

## Code Review Guidelines

### For Authors

- Keep PRs focused and reasonably sized
- Provide context in the PR description
- Respond to feedback constructively
- Test your changes thoroughly

### For Reviewers

- Be constructive and respectful
- Focus on code quality and correctness
- Check for security implications
- Verify tests are adequate

## Reporting Issues

When reporting bugs:

1. Check existing issues first
2. Use the issue template
3. Include reproduction steps
4. Provide environment details
5. Include error messages/logs (redact sensitive data)

## Questions?

Feel free to open a discussion or reach out to maintainers for guidance.
