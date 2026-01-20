/**
 * Skill Templates
 * Pre-built templates for common skill use cases
 * Based on agentskills.io specification
 */

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  skillMd: string;
  scripts?: Array<{ name: string; content: string; language: string }>;
  references?: Array<{ name: string; content: string }>;
  customizationPrompts: string[];
}

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: "code-review",
    name: "Code Review",
    description: "Review code for best practices, bugs, security vulnerabilities, and suggest improvements",
    category: "Development",
    icon: "code",
    customizationPrompts: [
      "What programming languages should this focus on?",
      "What specific areas should be reviewed (security, performance, style)?",
      "Should it suggest fixes or just identify issues?",
    ],
    skillMd: `---
name: code-review
description: Reviews code for best practices, potential bugs, security vulnerabilities, performance issues, and maintainability. Use when asked to review code, audit code quality, check for bugs, or improve existing code.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code and compatible AI agents
allowed-tools: Read Grep Glob
---

# Code Review Skill

## Overview
Performs comprehensive code reviews focusing on correctness, security, performance, and maintainability. This skill systematically analyzes code to identify issues and provide actionable feedback.

## When to Use
- User asks to "review", "audit", or "check" code
- Looking for bugs, security issues, or improvements
- Preparing code for production or PR review
- Analyzing code quality or technical debt

## Review Process

### Step 1: Understand Context
Before diving into the code, understand:
- The programming language and framework being used
- The purpose and intended behavior of the code
- Any existing patterns or conventions in the codebase
- The scope of the review (single file, module, or full codebase)

### Step 2: Check for Critical Issues

**Security Vulnerabilities**
- SQL injection, XSS, command injection
- Hardcoded secrets, API keys, or credentials
- Insecure authentication/authorization patterns
- Unsafe deserialization or file operations
- Missing input validation on user data

**Bugs and Logic Errors**
- Off-by-one errors in loops and array access
- Null/undefined reference issues
- Race conditions and deadlocks in concurrent code
- Incorrect error handling or swallowed exceptions
- Type mismatches and implicit conversions

### Step 3: Review Best Practices
- **Naming**: Are variables, functions, and classes named clearly and consistently?
- **Organization**: Is the code well-structured and modular?
- **Documentation**: Are complex sections documented? Are public APIs documented?
- **DRY**: Is there unnecessary code duplication?
- **SOLID**: Does the code follow appropriate design principles?

### Step 4: Performance Analysis
- **Complexity**: Are there O(n²) or worse algorithms that could be optimized?
- **Memory**: Are there potential memory leaks or excessive allocations?
- **Database**: Are queries efficient? Are there N+1 query problems?
- **Caching**: Could frequently-accessed data be cached?
- **I/O**: Are file/network operations batched appropriately?

### Step 5: Provide Structured Feedback
Format all findings with:
- Severity level (critical, warning, suggestion)
- Specific file and line numbers
- Clear explanation of the issue
- Recommended fix with code example when helpful

## Output Format

\`\`\`markdown
## Code Review Summary

**Files Reviewed:** [list files]
**Overall Assessment:** [brief summary]

### Critical Issues (must fix before merge)
1. **[Issue Title]** - \`filename:line\`
   - Problem: [description]
   - Fix: [recommendation]

### Warnings (should address)
1. **[Issue Title]** - \`filename:line\`
   - Problem: [description]
   - Suggestion: [recommendation]

### Suggestions (nice to have)
1. **[Suggestion]** - \`filename:line\`
   - Rationale: [why this would improve the code]

### Positive Observations
- [What's done well - acknowledge good patterns]
\`\`\`

## Examples

### Example Input
"Review this authentication function for security issues"

### Example Output
A structured review identifying:
- Any hardcoded credentials or weak hashing
- Missing rate limiting or brute force protection
- Session management issues
- Proper use of secure comparison functions

## Edge Cases
- **Minified code**: Request original source or note limitations
- **Very large files**: Focus on critical paths and public interfaces first
- **Generated code**: Skip reviewing auto-generated sections
- **Unfamiliar languages**: Note limitations, focus on universal patterns
- **No tests**: Flag as a warning and suggest test coverage priorities`,
    scripts: [
      {
        name: "security-patterns.py",
        language: "python",
        content: `#!/usr/bin/env python3
"""
Security Pattern Detection Helpers
Identifies common security anti-patterns in code
"""

import re
from typing import Dict, List, Tuple

# Common dangerous patterns by category
DANGEROUS_PATTERNS: Dict[str, List[Tuple[str, str]]] = {
    "sql_injection": [
        (r'execute\\s*\\([^)]*["\\']+\\s*\\+', "String concatenation in SQL execute"),
        (r'execute\\s*\\([^)]*%s', "Format string in SQL (use parameterized queries)"),
        (r'execute\\s*\\([^)]*\\.format\\s*\\(', "str.format() in SQL execute"),
        (r'f["\\']+.*SELECT.*{', "f-string in SQL query"),
    ],
    "xss": [
        (r'innerHTML\\s*=', "Direct innerHTML assignment (sanitize first)"),
        (r'document\\.write\\s*\\(', "document.write usage (avoid)"),
        (r'eval\\s*\\(', "eval() usage (extremely dangerous)"),
        (r'dangerouslySetInnerHTML', "React dangerouslySetInnerHTML (ensure sanitized)"),
    ],
    "hardcoded_secrets": [
        (r'password\\s*=\\s*["\\']+[^"\\']', "Hardcoded password"),
        (r'api_key\\s*=\\s*["\\']+[A-Za-z0-9]', "Hardcoded API key"),
        (r'secret\\s*=\\s*["\\']+[^"\\']', "Hardcoded secret"),
        (r'token\\s*=\\s*["\\']+[A-Za-z0-9]', "Hardcoded token"),
        (r'AWS_SECRET', "AWS credentials in code"),
    ],
    "command_injection": [
        (r'os\\.system\\s*\\([^)]*\\+', "String concat in os.system"),
        (r'subprocess\\.call\\s*\\([^)]*shell\\s*=\\s*True', "shell=True in subprocess"),
        (r'exec\\s*\\([^)]*\\+', "String concat in exec"),
    ],
    "path_traversal": [
        (r'open\\s*\\([^)]*\\+', "String concat in file open (validate path)"),
        (r'\\.\\./|\\.\\.\\\\', "Path traversal pattern detected"),
    ],
}

def scan_code(code: str) -> List[Dict[str, str]]:
    """Scan code for security issues and return findings."""
    findings = []
    lines = code.split('\\n')

    for category, patterns in DANGEROUS_PATTERNS.items():
        for pattern, description in patterns:
            for line_num, line in enumerate(lines, 1):
                if re.search(pattern, line, re.IGNORECASE):
                    findings.append({
                        "category": category,
                        "line": line_num,
                        "description": description,
                        "code": line.strip()[:100],
                    })

    return findings

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            results = scan_code(f.read())
            for r in results:
                print(f"[{r['category']}] Line {r['line']}: {r['description']}")
`,
      },
    ],
    references: [
      {
        name: "OWASP-TOP-10.md",
        content: `# OWASP Top 10 Quick Reference (2021)

## 1. Broken Access Control (A01)
- Enforce least privilege
- Deny by default
- Implement proper access control checks on every request
- Disable directory listing
- Log and alert on access control failures

## 2. Cryptographic Failures (A02)
- Classify data by sensitivity
- Don't store sensitive data unnecessarily
- Encrypt all sensitive data at rest and in transit
- Use strong, up-to-date algorithms
- Generate keys randomly with proper key management

## 3. Injection (A03)
- Use parameterized queries / prepared statements
- Use positive server-side input validation
- Escape special characters for residual dynamic queries
- Use LIMIT and other SQL controls to prevent mass disclosure

## 4. Insecure Design (A04)
- Establish secure development lifecycle
- Use threat modeling
- Integrate security in user stories
- Implement proper plausibility checks

## 5. Security Misconfiguration (A05)
- Hardened, minimal platform
- Remove unused features and frameworks
- Review and update configurations as part of patch management
- Implement proper error handling (no stack traces to users)

## 6. Vulnerable Components (A06)
- Remove unused dependencies
- Continuously inventory component versions
- Monitor CVE databases
- Only obtain components from official sources
- Prefer signed packages

## 7. Authentication Failures (A07)
- Implement multi-factor authentication
- Don't ship with default credentials
- Implement weak password checks
- Use secure session management
- Implement proper account lockout

## 8. Software and Data Integrity Failures (A08)
- Use digital signatures to verify software
- Ensure CI/CD pipeline has proper segregation
- Ensure unsigned/unencrypted data isn't sent to untrusted clients
- Review code changes before deployment

## 9. Security Logging Failures (A09)
- Log authentication, access control, and input validation failures
- Ensure logs are in a format that can be consumed by log management
- Encode log data to prevent injection
- Establish effective monitoring and alerting

## 10. Server-Side Request Forgery (A10)
- Sanitize and validate all client-supplied input
- Enforce URL schema, port, and destination with positive allow list
- Don't send raw responses to clients
- Disable HTTP redirections
`,
      },
    ],
  },
  {
    id: "documentation",
    name: "Documentation",
    description: "Generate and maintain comprehensive code documentation including docstrings, READMEs, and API docs",
    category: "Development",
    icon: "file-text",
    customizationPrompts: [
      "What documentation format do you prefer (JSDoc, Sphinx, etc.)?",
      "Should it generate README files?",
      "What level of detail is needed?",
    ],
    skillMd: `---
name: documentation
description: Generates comprehensive documentation for code including function docstrings, README files, API references, and inline comments. Use when asked to document code, create READMEs, generate API docs, or explain code.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code and compatible AI agents
allowed-tools: Read Write Glob
---

# Documentation Skill

## Overview
This skill generates and maintains high-quality documentation for codebases. It creates consistent, comprehensive documentation that helps developers understand and use code effectively.

## When to Use
- When asked to document code, functions, or classes
- When creating or updating README files
- When generating API documentation
- When adding inline comments to complex code
- When explaining how code works

## Documentation Types

### 1. Function/Method Documentation
Generate complete docstrings including:
- Brief description of what the function does
- Parameter descriptions with types
- Return value description with type
- Exceptions that may be raised
- Usage examples for complex functions

**JSDoc Format:**
\`\`\`javascript
/**
 * Calculates the total price including tax and discounts.
 *
 * @param {number} basePrice - The original price before modifications
 * @param {number} taxRate - Tax rate as a decimal (e.g., 0.08 for 8%)
 * @param {number} [discount=0] - Optional discount as a decimal
 * @returns {number} The final calculated price
 * @throws {Error} If basePrice or taxRate is negative
 *
 * @example
 * calculateTotal(100, 0.08, 0.1) // Returns 97.2
 */
\`\`\`

**Python Docstring Format:**
\`\`\`python
def calculate_total(base_price: float, tax_rate: float, discount: float = 0) -> float:
    """
    Calculate the total price including tax and discounts.

    Args:
        base_price: The original price before modifications.
        tax_rate: Tax rate as a decimal (e.g., 0.08 for 8%).
        discount: Optional discount as a decimal. Defaults to 0.

    Returns:
        The final calculated price.

    Raises:
        ValueError: If base_price or tax_rate is negative.

    Example:
        >>> calculate_total(100, 0.08, 0.1)
        97.2
    """
\`\`\`

### 2. README Generation
Create comprehensive README files with:
- Project title and badges
- Brief description and motivation
- Features list
- Installation instructions
- Quick start / usage examples
- Configuration options
- API reference (or link to full docs)
- Contributing guidelines
- License information

### 3. API Documentation
Document REST APIs with:
- Endpoint URL and method
- Request parameters (path, query, body)
- Request/response examples
- Authentication requirements
- Error codes and meanings
- Rate limiting information

### 4. Inline Comments
Add comments for:
- Complex algorithms (explain the approach)
- Non-obvious business logic
- Workarounds or hacks (explain why)
- Performance-critical sections
- Security-sensitive code

## Best Practices

### Do:
- Keep documentation close to the code it describes
- Update documentation when code changes
- Use clear, concise language
- Include practical examples
- Document edge cases and gotchas
- Use consistent formatting throughout

### Don't:
- Document obvious code ("increment counter by 1")
- Let documentation become stale
- Write novels - be concise
- Document implementation details that may change
- Assume reader knows your domain jargon

## Output Guidelines
When generating documentation:
1. Match the existing style if present
2. Use the appropriate format for the language
3. Focus on the "why" not just the "what"
4. Include examples for anything non-trivial
5. Keep line lengths readable (80-100 chars)`,
    scripts: [
      {
        name: "readme-generator.py",
        language: "python",
        content: `#!/usr/bin/env python3
"""
README Generator
Generates a README.md template based on project analysis
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional

def detect_project_type(path: str) -> Dict[str, any]:
    """Detect project type and gather metadata."""
    info = {
        "type": "unknown",
        "language": "unknown",
        "package_manager": None,
        "name": Path(path).name,
        "has_tests": False,
        "has_docs": False,
    }

    files = os.listdir(path)

    # Detect by config files
    if "package.json" in files:
        info["type"] = "node"
        info["language"] = "JavaScript/TypeScript"
        info["package_manager"] = "npm"
        with open(os.path.join(path, "package.json")) as f:
            pkg = json.load(f)
            info["name"] = pkg.get("name", info["name"])
            info["description"] = pkg.get("description", "")
    elif "pyproject.toml" in files or "setup.py" in files:
        info["type"] = "python"
        info["language"] = "Python"
        info["package_manager"] = "pip"
    elif "Cargo.toml" in files:
        info["type"] = "rust"
        info["language"] = "Rust"
        info["package_manager"] = "cargo"
    elif "go.mod" in files:
        info["type"] = "go"
        info["language"] = "Go"
        info["package_manager"] = "go"

    # Check for tests/docs
    info["has_tests"] = any(d in files for d in ["tests", "test", "__tests__", "spec"])
    info["has_docs"] = any(d in files for d in ["docs", "documentation", "doc"])

    return info

def generate_readme(project_info: Dict) -> str:
    """Generate a README template based on project info."""
    template = f"""# {project_info['name']}

> Brief description of your project

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/username/{project_info['name']}.git
cd {project_info['name']}

# Install dependencies
"""

    if project_info["package_manager"] == "npm":
        template += "npm install\\n"
    elif project_info["package_manager"] == "pip":
        template += "pip install -r requirements.txt\\n"
    elif project_info["package_manager"] == "cargo":
        template += "cargo build\\n"
    elif project_info["package_manager"] == "go":
        template += "go mod download\\n"

    template += """\`\`\`

## Usage

\`\`\`
# Add usage examples here
\`\`\`

## Configuration

Describe any configuration options here.

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details
"""

    return template

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "."
    info = detect_project_type(path)
    print(generate_readme(info))
`,
      },
    ],
    references: [
      {
        name: "DOCSTRING-FORMATS.md",
        content: `# Docstring Format Reference

## Python (Google Style)
\`\`\`python
def function(arg1: str, arg2: int) -> bool:
    """Short description.

    Longer description if needed.

    Args:
        arg1: Description of arg1.
        arg2: Description of arg2.

    Returns:
        Description of return value.

    Raises:
        ValueError: If arg2 is negative.
    """
\`\`\`

## Python (NumPy Style)
\`\`\`python
def function(arg1, arg2):
    """
    Short description.

    Parameters
    ----------
    arg1 : str
        Description of arg1.
    arg2 : int
        Description of arg2.

    Returns
    -------
    bool
        Description of return value.
    """
\`\`\`

## JavaScript (JSDoc)
\`\`\`javascript
/**
 * Short description.
 *
 * @param {string} arg1 - Description of arg1
 * @param {number} arg2 - Description of arg2
 * @returns {boolean} Description of return value
 * @throws {Error} If arg2 is negative
 */
\`\`\`

## TypeScript (TSDoc)
\`\`\`typescript
/**
 * Short description.
 *
 * @param arg1 - Description of arg1
 * @param arg2 - Description of arg2
 * @returns Description of return value
 * @throws Error if arg2 is negative
 */
\`\`\`

## Rust (rustdoc)
\`\`\`rust
/// Short description.
///
/// # Arguments
///
/// * \`arg1\` - Description of arg1
/// * \`arg2\` - Description of arg2
///
/// # Returns
///
/// Description of return value.
///
/// # Errors
///
/// Returns an error if arg2 is negative.
///
/// # Examples
///
/// \`\`\`
/// let result = function("test", 5);
/// \`\`\`
\`\`\`
`,
      },
    ],
  },
  {
    id: "testing",
    name: "Testing Helper",
    description: "Write and improve tests including unit tests, integration tests, and end-to-end tests",
    category: "Development",
    icon: "check-circle",
    customizationPrompts: [
      "What testing framework do you use?",
      "What types of tests are needed (unit, integration, e2e)?",
      "What is your target code coverage?",
    ],
    skillMd: `---
name: testing-helper
description: Helps write comprehensive tests including unit tests, integration tests, and end-to-end tests. Use when asked to write tests, improve test coverage, debug failing tests, or review test quality.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code and compatible AI agents
allowed-tools: Bash(npm:test) Bash(npx:vitest) Bash(npx:jest) Bash(pytest:*) Read Write
---

# Testing Helper Skill

## Overview
This skill helps create and improve tests for codebases. It focuses on writing effective, maintainable tests that catch bugs and document expected behavior.

## When to Use
- Writing new tests for existing code
- Improving test coverage for a module
- Debugging failing tests
- Reviewing test quality and suggesting improvements
- Setting up testing infrastructure

## Test Types

### Unit Tests
Test individual functions and components in isolation:
- Mock external dependencies
- Test edge cases and boundary conditions
- Verify return values and state changes
- Check error handling

**Good unit test characteristics:**
- Fast (< 100ms)
- Independent (no test order dependency)
- Repeatable (same result every time)
- Self-validating (pass/fail, no manual inspection)

### Integration Tests
Test how components work together:
- Database operations with real/test DB
- API endpoints with HTTP requests
- Service integrations
- Event handling across modules

### End-to-End Tests
Test complete user flows:
- Critical user journeys
- Common scenarios
- Error scenarios and recovery
- Cross-browser/device testing (for web)

## Test Writing Process

### Step 1: Analyze the Code
- Understand what the code should do
- Identify inputs, outputs, and side effects
- Find edge cases and error conditions
- Note any existing tests

### Step 2: Plan Test Cases
Structure tests around:
- **Happy path**: Normal successful operation
- **Edge cases**: Boundary values, empty inputs, max values
- **Error cases**: Invalid input, network failures, timeouts
- **Security cases**: Injection attempts, unauthorized access

### Step 3: Write Tests
Follow the AAA pattern:
\`\`\`javascript
describe('calculateTotal', () => {
  it('should apply tax and discount correctly', () => {
    // Arrange - Set up test data
    const basePrice = 100;
    const taxRate = 0.08;
    const discount = 0.1;

    // Act - Execute the code
    const result = calculateTotal(basePrice, taxRate, discount);

    // Assert - Verify results
    expect(result).toBe(97.2);
  });
});
\`\`\`

### Step 4: Verify Coverage
- Run coverage report
- Identify untested branches
- Add tests for uncovered paths
- Don't chase 100% - focus on critical paths

## Test Naming Conventions

Use descriptive names that explain behavior:
\`\`\`javascript
// Good
it('should return empty array when no items match filter')
it('should throw AuthError when token is expired')
it('should retry failed requests up to 3 times')

// Bad
it('test1')
it('works')
it('handles error')
\`\`\`

## Framework-Specific Patterns

### Jest/Vitest (JavaScript/TypeScript)
\`\`\`javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('UserService', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    mockDb = { query: vi.fn() };
    service = new UserService(mockDb);
  });

  it('should fetch user by id', async () => {
    mockDb.query.mockResolvedValue({ id: 1, name: 'Test' });

    const user = await service.getById(1);

    expect(user.name).toBe('Test');
    expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
  });
});
\`\`\`

### pytest (Python)
\`\`\`python
import pytest
from unittest.mock import Mock, patch

class TestUserService:
    @pytest.fixture
    def mock_db(self):
        return Mock()

    @pytest.fixture
    def service(self, mock_db):
        return UserService(mock_db)

    def test_fetch_user_by_id(self, service, mock_db):
        mock_db.query.return_value = {"id": 1, "name": "Test"}

        user = service.get_by_id(1)

        assert user["name"] == "Test"
        mock_db.query.assert_called_once()
\`\`\`

## Common Testing Mistakes to Avoid

1. **Testing implementation, not behavior**: Tests break when refactoring
2. **Too many assertions**: Hard to identify failure cause
3. **Test interdependence**: Tests fail when run in different order
4. **Mocking too much**: Tests pass but real code fails
5. **Ignoring flaky tests**: Erodes trust in test suite
6. **No cleanup**: Tests leave state that affects others

## Coverage Guidelines

| Coverage Type | Target | Notes |
|--------------|--------|-------|
| Line coverage | 70-80% | Focus on critical paths |
| Branch coverage | 60-70% | Test both if/else branches |
| Function coverage | 80-90% | All public functions tested |

Don't aim for 100% - diminishing returns. Focus on:
- Business-critical code
- Complex logic
- Error handling paths
- Security-sensitive code`,
    scripts: [
      {
        name: "test-template.js",
        language: "javascript",
        content: `/**
 * Test Template Generator
 * Generates test file templates based on source file analysis
 */

function generateTestTemplate(sourceCode, filename) {
  // Extract function names
  const functionRegex = /(?:export\\s+)?(?:async\\s+)?function\\s+(\\w+)|(?:export\\s+)?const\\s+(\\w+)\\s*=\\s*(?:async\\s+)?(?:\\([^)]*\\)|\\w+)\\s*=>/g;
  const functions = [];
  let match;

  while ((match = functionRegex.exec(sourceCode)) !== null) {
    functions.push(match[1] || match[2]);
  }

  // Generate test template
  const moduleName = filename.replace(/\\.[jt]sx?$/, '');

  let template = \`import { describe, it, expect, vi, beforeEach } from 'vitest';
import { \\\${functions.join(', ')} } from './\\\${moduleName}';

describe('\\\${moduleName}', () => {
\`;

  functions.forEach(fn => {
    template += \`
  describe('\\\${fn}', () => {
    it('should handle normal input correctly', () => {
      // Arrange
      const input = /* TODO: add test input */;

      // Act
      const result = \\\${fn}(input);

      // Assert
      expect(result).toBeDefined();
      // TODO: Add specific assertions
    });

    it('should handle edge cases', () => {
      // TODO: Test boundary values, empty inputs, etc.
    });

    it('should handle errors appropriately', () => {
      // TODO: Test error conditions
    });
  });
\`;
  });

  template += '});\\n';

  return template;
}

module.exports = { generateTestTemplate };
`,
      },
    ],
    references: [
      {
        name: "TESTING-BEST-PRACTICES.md",
        content: `# Testing Best Practices

## The Testing Pyramid

\`\`\`
       /\\
      /  \\     E2E Tests (few, slow, expensive)
     /----\\
    /      \\   Integration Tests (some)
   /--------\\
  /          \\ Unit Tests (many, fast, cheap)
 /------------\\
\`\`\`

## Test Isolation

### Do:
- Each test should be independent
- Use fresh fixtures/mocks for each test
- Clean up after tests (database, files)
- Use dependency injection for testability

### Don't:
- Share mutable state between tests
- Rely on test execution order
- Use real external services in unit tests
- Leave test data in production systems

## Mocking Guidelines

### When to Mock:
- External services (APIs, databases in unit tests)
- Time-dependent code (dates, timers)
- Random number generators
- File system operations

### When NOT to Mock:
- The code under test
- Simple value objects
- Standard library functions
- Things that are fast and deterministic

## Assertion Best Practices

\`\`\`javascript
// Good: Specific assertions
expect(user.email).toBe('test@example.com');
expect(users).toHaveLength(3);
expect(fn).toThrow(ValidationError);

// Bad: Vague assertions
expect(user).toBeTruthy();
expect(result).not.toBe(null);
\`\`\`

## Test Data Management

1. **Use factories/builders** for complex objects
2. **Keep test data minimal** - only what's needed
3. **Make data obvious** - no magic values
4. **Use realistic data** - catches real-world bugs

## Flaky Test Prevention

1. Don't depend on timing (use fake timers)
2. Don't depend on external services
3. Don't depend on test order
4. Use explicit waits, not sleep
5. Isolate tests from each other
`,
      },
    ],
  },
  {
    id: "git-workflow",
    name: "Git Workflow",
    description: "Manage git operations including commits, branches, PRs, and resolve conflicts",
    category: "Development",
    icon: "git-branch",
    customizationPrompts: [
      "What is your branching strategy (gitflow, trunk-based)?",
      "What commit message format do you use?",
      "Should it handle PR reviews?",
    ],
    skillMd: `---
name: git-workflow
description: Manages git operations including commits, branches, pull requests, and conflict resolution. Use when working with git, creating commits, managing branches, or preparing pull requests.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code and compatible AI agents
allowed-tools: Bash(git:*)
---

# Git Workflow Skill

## Overview
This skill helps manage git operations and workflows effectively. It covers commit conventions, branching strategies, and pull request best practices.

## When to Use
- Creating commits with good messages
- Managing feature branches
- Preparing and reviewing pull requests
- Resolving merge conflicts
- Understanding git history

## Commit Guidelines

### Conventional Commits Format
\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

### Commit Types
| Type | Description |
|------|-------------|
| feat | New feature for the user |
| fix | Bug fix for the user |
| docs | Documentation only changes |
| style | Formatting, missing semicolons, etc. |
| refactor | Code change that neither fixes a bug nor adds a feature |
| perf | Performance improvement |
| test | Adding or updating tests |
| build | Changes to build system or dependencies |
| ci | Changes to CI configuration |
| chore | Other changes that don't modify src or test files |

### Good Commit Messages

**Do:**
\`\`\`
feat(auth): add password reset functionality

- Add forgot password form
- Implement email sending service
- Add reset token generation and validation

Closes #123
\`\`\`

**Don't:**
\`\`\`
fixed stuff
\`\`\`

### Subject Line Rules
- Use imperative mood ("Add feature" not "Added feature")
- Don't capitalize first letter after type
- No period at the end
- Max 50 characters
- Reference issues when relevant

## Branching Strategy

### Branch Naming Convention
\`\`\`
<type>/<short-description>

Examples:
feature/user-authentication
bugfix/login-validation-error
hotfix/security-patch-2.1
release/v2.0.0
\`\`\`

### Branch Types
- **main/master**: Production-ready code
- **develop**: Integration branch for features (if using gitflow)
- **feature/**: New features
- **bugfix/**: Bug fixes for develop
- **hotfix/**: Urgent fixes for production
- **release/**: Release preparation

### Workflow Commands

**Starting a feature:**
\`\`\`bash
git checkout main
git pull origin main
git checkout -b feature/new-feature
\`\`\`

**Keeping branch updated:**
\`\`\`bash
git fetch origin
git rebase origin/main
# OR
git merge origin/main
\`\`\`

**Finishing a feature:**
\`\`\`bash
git checkout main
git pull origin main
git merge --no-ff feature/new-feature
git push origin main
git branch -d feature/new-feature
\`\`\`

## Pull Request Best Practices

### PR Checklist
- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] New tests added for new functionality
- [ ] Documentation updated if needed
- [ ] No merge conflicts
- [ ] Follows coding standards
- [ ] Reviewed own diff before requesting review

### PR Description Template
\`\`\`markdown
## Summary
Brief description of what this PR does.

## Changes
- Change 1
- Change 2

## Testing
Describe how this was tested.

## Screenshots (if UI changes)
[Add screenshots]

## Related Issues
Closes #123
\`\`\`

### Code Review Guidelines

**As a Reviewer:**
- Review within 24 hours
- Be constructive and kind
- Ask questions rather than make demands
- Approve when concerns are addressed
- Don't nitpick style if there's a linter

**As an Author:**
- Keep PRs small (< 400 lines)
- Provide context in description
- Respond to all comments
- Don't take feedback personally

## Conflict Resolution

### Steps to Resolve Conflicts
1. **Update your branch:**
   \`\`\`bash
   git fetch origin
   git rebase origin/main
   # Conflict occurs
   \`\`\`

2. **Identify conflicts:**
   \`\`\`bash
   git status
   # Shows files with conflicts
   \`\`\`

3. **Edit conflicting files:**
   \`\`\`
   <<<<<<< HEAD
   Your changes
   =======
   Their changes
   >>>>>>> main
   \`\`\`

4. **Mark as resolved:**
   \`\`\`bash
   git add <resolved-file>
   git rebase --continue
   \`\`\`

5. **Force push (if needed):**
   \`\`\`bash
   git push --force-with-lease origin feature/your-branch
   \`\`\`

## Useful Git Commands

### Inspection
\`\`\`bash
git log --oneline -20                    # Recent commits
git log --graph --oneline --all          # Visual branch history
git diff main..feature-branch            # Compare branches
git show <commit>                        # Show commit details
git blame <file>                         # Line-by-line history
\`\`\`

### Fixing Mistakes
\`\`\`bash
git commit --amend                       # Fix last commit
git reset --soft HEAD~1                  # Undo commit, keep changes
git reset --hard HEAD~1                  # Undo commit, discard changes
git revert <commit>                      # Create undo commit
git stash                                # Temporarily save changes
git stash pop                            # Restore stashed changes
\`\`\`

### Cleaning Up
\`\`\`bash
git branch -d <branch>                   # Delete merged branch
git branch -D <branch>                   # Force delete branch
git remote prune origin                  # Clean deleted remote branches
git gc                                   # Garbage collect
\`\`\``,
    scripts: [
      {
        name: "commit-validator.sh",
        language: "bash",
        content: `#!/bin/bash
# Validates commit message format (Conventional Commits)

commit_msg_file="\$1"
commit_msg=$(cat "\$commit_msg_file")

# Regex for conventional commits
pattern="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\\([a-z0-9-]+\\))?: .{1,50}$"

# Get first line
first_line=$(echo "\$commit_msg" | head -n 1)

if ! echo "\$first_line" | grep -qE "\$pattern"; then
    echo "ERROR: Commit message doesn't follow Conventional Commits format"
    echo ""
    echo "Expected format: <type>(<scope>): <subject>"
    echo ""
    echo "Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore"
    echo "Subject: max 50 chars, imperative mood, no period"
    echo ""
    echo "Example: feat(auth): add password reset functionality"
    echo ""
    echo "Your message: \$first_line"
    exit 1
fi

echo "Commit message format OK"
exit 0
`,
      },
    ],
    references: [
      {
        name: "PR-TEMPLATE.md",
        content: `## Summary
<!-- Brief description of changes -->

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
<!-- List the changes made in this PR -->
-

## How Has This Been Tested?
<!-- Describe the tests you ran -->
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Related Issues
<!-- Link related issues: Closes #123 -->
`,
      },
    ],
  },
  {
    id: "api-integration",
    name: "API Integration",
    description: "Connect to and interact with external APIs including authentication, requests, and error handling",
    category: "Integration",
    icon: "link",
    customizationPrompts: [
      "What APIs will you be integrating with?",
      "What authentication methods are used?",
      "Should it handle rate limiting?",
    ],
    skillMd: `---
name: api-integration
description: Helps integrate with external APIs including authentication setup, request handling, error management, and rate limiting. Use when connecting to APIs, building integrations, or handling API responses.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code and compatible AI agents
allowed-tools: Read Write Bash(curl:*)
---

# API Integration Skill

## Overview
This skill helps integrate with external APIs effectively. It covers authentication patterns, request building, response handling, and error management.

## When to Use
- Setting up new API integrations
- Handling authentication flows
- Building API client wrappers
- Managing rate limits and retries
- Debugging API issues

## Authentication Methods

### 1. API Keys
**Header-based:**
\`\`\`javascript
const response = await fetch(url, {
  headers: {
    'X-API-Key': process.env.API_KEY,
    // or
    'Authorization': \`ApiKey \\\${process.env.API_KEY}\`
  }
});
\`\`\`

**Query parameter (less secure):**
\`\`\`javascript
const url = \`\\\${baseUrl}?api_key=\\\${process.env.API_KEY}\`;
\`\`\`

### 2. Bearer Tokens (JWT/OAuth)
\`\`\`javascript
const response = await fetch(url, {
  headers: {
    'Authorization': \`Bearer \\\${accessToken}\`
  }
});
\`\`\`

### 3. OAuth 2.0 Flow
\`\`\`javascript
// Step 1: Redirect to authorization
const authUrl = \`\\\${oauthProvider}/authorize?
  client_id=\\\${CLIENT_ID}&
  redirect_uri=\\\${REDIRECT_URI}&
  response_type=code&
  scope=read write\`;

// Step 2: Exchange code for token
const tokenResponse = await fetch(\`\\\${oauthProvider}/token\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI
  })
});

// Step 3: Use access token
const { access_token, refresh_token, expires_in } = await tokenResponse.json();
\`\`\`

### 4. Basic Authentication
\`\`\`javascript
const credentials = Buffer.from(\`\\\${username}:\\\${password}\`).toString('base64');
const response = await fetch(url, {
  headers: {
    'Authorization': \`Basic \\\${credentials}\`
  }
});
\`\`\`

## Request Building

### HTTP Methods
| Method | Use Case |
|--------|----------|
| GET | Retrieve data |
| POST | Create new resource |
| PUT | Replace entire resource |
| PATCH | Update partial resource |
| DELETE | Remove resource |

### Headers
\`\`\`javascript
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': \`Bearer \\\${token}\`,
  'User-Agent': 'MyApp/1.0',
  // Rate limit tracking
  'X-Request-ID': generateRequestId(),
};
\`\`\`

### Request Body
\`\`\`javascript
// JSON
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' })
});

// Form data
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('name', 'document.pdf');

const response = await fetch(url, {
  method: 'POST',
  body: formData  // Don't set Content-Type - browser sets it with boundary
});

// URL-encoded
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ username: 'john', password: 'secret' })
});
\`\`\`

## Response Handling

### Status Codes
| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Parse response |
| 201 | Created | Parse response, may include new resource |
| 204 | No Content | Success, no body |
| 400 | Bad Request | Fix request parameters |
| 401 | Unauthorized | Refresh token or re-authenticate |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Implement backoff, check Retry-After |
| 500 | Server Error | Retry with backoff |

### Response Parsing
\`\`\`javascript
async function handleResponse(response) {
  // Check for errors first
  if (!response.ok) {
    const error = await parseError(response);
    throw new ApiError(response.status, error.message);
  }

  // Handle different content types
  const contentType = response.headers.get('Content-Type');

  if (contentType?.includes('application/json')) {
    return response.json();
  } else if (contentType?.includes('text/')) {
    return response.text();
  } else {
    return response.blob();
  }
}
\`\`\`

## Error Handling

### Retry Logic with Exponential Backoff
\`\`\`javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry client errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new ApiError(response.status, await response.text());
      }

      // Retry server errors and rate limits
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.pow(2, attempt) * 1000;

        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      // Network errors - retry
      if (error.name === 'TypeError' || error.code === 'ECONNRESET') {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
\`\`\`

### Circuit Breaker Pattern
\`\`\`javascript
class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failures = 0;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}
\`\`\`

## Rate Limiting

### Tracking Rate Limits
\`\`\`javascript
class RateLimiter {
  constructor() {
    this.limits = new Map();
  }

  updateFromHeaders(response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.limits.set('current', {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset) * 1000  // Convert to ms
      });
    }
  }

  canMakeRequest() {
    const current = this.limits.get('current');
    if (!current) return true;

    if (current.remaining <= 0 && Date.now() < current.reset) {
      return false;
    }
    return true;
  }

  getWaitTime() {
    const current = this.limits.get('current');
    if (!current || current.remaining > 0) return 0;
    return Math.max(0, current.reset - Date.now());
  }
}
\`\`\`

## Best Practices

### Do:
- Store credentials in environment variables
- Use HTTPS for all requests
- Implement proper error handling
- Add request timeouts
- Log requests for debugging (sanitize secrets)
- Cache responses when appropriate
- Use connection pooling for high-volume APIs

### Don't:
- Hardcode API keys in source code
- Ignore rate limits
- Retry indefinitely
- Log sensitive data
- Trust API responses without validation
- Make synchronous calls in hot paths`,
    scripts: [
      {
        name: "api-client.js",
        language: "javascript",
        content: `/**
 * Reusable API Client with built-in error handling and retries
 */

class ApiClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\\/$/, '');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
  }

  async request(method, path, { body, headers, params } = {}) {
    const url = new URL(\`\\\${this.baseUrl}\\\${path}\`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchWithRetry(url.toString(), {
        method,
        headers: { ...this.defaultHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleError(error);
    }
  }

  async fetchWithRetry(url, options, attempt = 0) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 || response.status >= 500) {
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
          return this.fetchWithRetry(url, options, attempt + 1);
        }
      }

      return response;
    } catch (error) {
      if (attempt < this.maxRetries && error.name !== 'AbortError') {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  async handleResponse(response) {
    const contentType = response.headers.get('Content-Type') || '';

    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(data.message || response.statusText);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  handleError(error) {
    if (error.name === 'AbortError') {
      error.message = 'Request timed out';
    }
    return error;
  }

  // Convenience methods
  get(path, options) { return this.request('GET', path, options); }
  post(path, body, options) { return this.request('POST', path, { ...options, body }); }
  put(path, body, options) { return this.request('PUT', path, { ...options, body }); }
  patch(path, body, options) { return this.request('PATCH', path, { ...options, body }); }
  delete(path, options) { return this.request('DELETE', path, options); }
}

module.exports = { ApiClient };
`,
      },
    ],
    references: [
      {
        name: "HTTP-STATUS-CODES.md",
        content: `# HTTP Status Code Reference

## 2xx Success
| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Request accepted for processing |
| 204 | No Content | Success with no response body |

## 3xx Redirection
| Code | Name | Description |
|------|------|-------------|
| 301 | Moved Permanently | Resource moved permanently |
| 302 | Found | Temporary redirect |
| 304 | Not Modified | Cached version is still valid |

## 4xx Client Errors
| Code | Name | Description |
|------|------|-------------|
| 400 | Bad Request | Invalid request syntax |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |

## 5xx Server Errors
| Code | Name | Description |
|------|------|-------------|
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Invalid upstream response |
| 503 | Service Unavailable | Server temporarily unavailable |
| 504 | Gateway Timeout | Upstream timeout |

## Error Handling Strategy

\`\`\`
4xx errors -> Fix request, don't retry automatically
429 errors -> Retry with backoff, respect Retry-After
5xx errors -> Retry with exponential backoff
Network errors -> Retry with backoff
\`\`\`
`,
      },
    ],
  },
  {
    id: "data-analysis",
    name: "Data Analysis",
    description: "Analyze and visualize data including statistics, patterns, and generating reports",
    category: "Data",
    icon: "bar-chart",
    customizationPrompts: [
      "What types of data will you analyze?",
      "What visualization tools do you use?",
      "Should it generate reports?",
    ],
    skillMd: `---
name: data-analysis
description: Analyzes datasets, generates statistics, finds patterns, and creates visualizations. Use when asked to analyze data, find insights, create reports, or visualize trends.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code and compatible AI agents. Requires Python with pandas, numpy, matplotlib.
allowed-tools: Bash(python:*) Read Write
---

# Data Analysis Skill

## Overview
This skill helps analyze data, find patterns, generate statistics, and create visualizations. It follows a systematic approach to extract insights from datasets.

## When to Use
- Exploring new datasets
- Finding patterns and correlations
- Generating statistical summaries
- Creating visualizations
- Building reports and dashboards
- Cleaning and preprocessing data

## Analysis Process

### Step 1: Data Loading & Inspection
First, understand what you're working with:

\`\`\`python
import pandas as pd
import numpy as np

# Load data
df = pd.read_csv('data.csv')

# Basic inspection
print(f"Shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")
print(f"\\nData types:\\n{df.dtypes}")
print(f"\\nFirst few rows:\\n{df.head()}")
print(f"\\nMissing values:\\n{df.isnull().sum()}")
\`\`\`

### Step 2: Data Cleaning
Handle common data quality issues:

\`\`\`python
# Remove duplicates
df = df.drop_duplicates()

# Handle missing values
df['numeric_col'] = df['numeric_col'].fillna(df['numeric_col'].median())
df['category_col'] = df['category_col'].fillna('Unknown')

# Fix data types
df['date_col'] = pd.to_datetime(df['date_col'])
df['id_col'] = df['id_col'].astype(str)

# Remove outliers (IQR method)
Q1 = df['value'].quantile(0.25)
Q3 = df['value'].quantile(0.75)
IQR = Q3 - Q1
df = df[(df['value'] >= Q1 - 1.5*IQR) & (df['value'] <= Q3 + 1.5*IQR)]
\`\`\`

### Step 3: Exploratory Data Analysis

**Numerical Summary:**
\`\`\`python
# Descriptive statistics
print(df.describe())

# Specific metrics
print(f"Mean: {df['value'].mean():.2f}")
print(f"Median: {df['value'].median():.2f}")
print(f"Std Dev: {df['value'].std():.2f}")
print(f"Skewness: {df['value'].skew():.2f}")
\`\`\`

**Categorical Analysis:**
\`\`\`python
# Value counts
print(df['category'].value_counts())
print(df['category'].value_counts(normalize=True))

# Cross-tabulation
pd.crosstab(df['category_a'], df['category_b'])
\`\`\`

**Correlation Analysis:**
\`\`\`python
# Correlation matrix
corr_matrix = df.select_dtypes(include=[np.number]).corr()
print(corr_matrix)

# Find strong correlations
strong_corr = corr_matrix[abs(corr_matrix) > 0.7]
\`\`\`

### Step 4: Visualization

**Distribution Plots:**
\`\`\`python
import matplotlib.pyplot as plt
import seaborn as sns

# Histogram
plt.figure(figsize=(10, 6))
plt.hist(df['value'], bins=30, edgecolor='black')
plt.xlabel('Value')
plt.ylabel('Frequency')
plt.title('Distribution of Values')
plt.savefig('distribution.png')

# Box plot
plt.figure(figsize=(10, 6))
df.boxplot(column='value', by='category')
plt.savefig('boxplot.png')
\`\`\`

**Relationship Plots:**
\`\`\`python
# Scatter plot
plt.figure(figsize=(10, 6))
plt.scatter(df['x'], df['y'], alpha=0.5)
plt.xlabel('X')
plt.ylabel('Y')
plt.title('X vs Y')
plt.savefig('scatter.png')

# Correlation heatmap
plt.figure(figsize=(12, 8))
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0)
plt.title('Correlation Matrix')
plt.savefig('correlation_heatmap.png')
\`\`\`

**Time Series:**
\`\`\`python
# Line plot over time
df_time = df.set_index('date')
plt.figure(figsize=(12, 6))
df_time['value'].plot()
plt.xlabel('Date')
plt.ylabel('Value')
plt.title('Value Over Time')
plt.savefig('timeseries.png')

# Rolling average
df_time['rolling_avg'] = df_time['value'].rolling(window=7).mean()
\`\`\`

### Step 5: Statistical Testing

\`\`\`python
from scipy import stats

# T-test (compare two groups)
group_a = df[df['group'] == 'A']['value']
group_b = df[df['group'] == 'B']['value']
t_stat, p_value = stats.ttest_ind(group_a, group_b)
print(f"T-statistic: {t_stat:.4f}, P-value: {p_value:.4f}")

# Chi-square test (categorical association)
contingency = pd.crosstab(df['cat_a'], df['cat_b'])
chi2, p_value, dof, expected = stats.chi2_contingency(contingency)
print(f"Chi-square: {chi2:.4f}, P-value: {p_value:.4f}")

# Correlation significance
corr, p_value = stats.pearsonr(df['x'], df['y'])
print(f"Correlation: {corr:.4f}, P-value: {p_value:.4f}")
\`\`\`

### Step 6: Generate Report

Structure findings clearly:

\`\`\`markdown
# Data Analysis Report

## Executive Summary
- Key finding 1
- Key finding 2
- Recommendation

## Dataset Overview
- Records: X
- Time period: Y
- Key variables: Z

## Key Findings

### Finding 1: [Title]
[Description with supporting statistics and visualization]

### Finding 2: [Title]
[Description with supporting statistics and visualization]

## Recommendations
1. [Action item based on findings]
2. [Action item based on findings]

## Appendix
- Methodology
- Data dictionary
- Additional charts
\`\`\`

## Common Analysis Patterns

### Segmentation Analysis
\`\`\`python
# Group by and aggregate
segments = df.groupby('segment').agg({
    'value': ['mean', 'median', 'std', 'count'],
    'another_metric': ['sum', 'mean']
}).round(2)
\`\`\`

### Trend Analysis
\`\`\`python
# Month-over-month change
df['month'] = df['date'].dt.to_period('M')
monthly = df.groupby('month')['value'].sum()
monthly_pct_change = monthly.pct_change() * 100
\`\`\`

### Cohort Analysis
\`\`\`python
# Define cohorts
df['cohort'] = df.groupby('user_id')['date'].transform('min').dt.to_period('M')
df['period'] = (df['date'].dt.to_period('M') - df['cohort']).apply(lambda x: x.n)

# Cohort pivot table
cohort_data = df.groupby(['cohort', 'period']).agg({'user_id': 'nunique'})
cohort_pivot = cohort_data.unstack(level='period')
\`\`\``,
    scripts: [
      {
        name: "data_profiler.py",
        language: "python",
        content: `#!/usr/bin/env python3
"""
Data Profiling Script
Generates a comprehensive profile of a dataset
"""

import pandas as pd
import numpy as np
from typing import Dict, Any
import json
import sys

def profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate a comprehensive profile of a DataFrame."""

    profile = {
        "overview": {
            "rows": len(df),
            "columns": len(df.columns),
            "memory_usage_mb": df.memory_usage(deep=True).sum() / 1024 / 1024,
            "duplicated_rows": df.duplicated().sum(),
        },
        "columns": {}
    }

    for col in df.columns:
        col_profile = {
            "dtype": str(df[col].dtype),
            "missing": int(df[col].isnull().sum()),
            "missing_pct": round(df[col].isnull().sum() / len(df) * 100, 2),
            "unique": int(df[col].nunique()),
            "unique_pct": round(df[col].nunique() / len(df) * 100, 2),
        }

        # Numeric columns
        if pd.api.types.is_numeric_dtype(df[col]):
            col_profile["stats"] = {
                "mean": round(df[col].mean(), 4) if not df[col].isnull().all() else None,
                "median": round(df[col].median(), 4) if not df[col].isnull().all() else None,
                "std": round(df[col].std(), 4) if not df[col].isnull().all() else None,
                "min": float(df[col].min()) if not df[col].isnull().all() else None,
                "max": float(df[col].max()) if not df[col].isnull().all() else None,
                "zeros": int((df[col] == 0).sum()),
                "negatives": int((df[col] < 0).sum()),
            }

        # Categorical/string columns
        elif pd.api.types.is_string_dtype(df[col]) or pd.api.types.is_categorical_dtype(df[col]):
            value_counts = df[col].value_counts().head(10)
            col_profile["top_values"] = {
                str(k): int(v) for k, v in value_counts.items()
            }

        # DateTime columns
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            col_profile["date_range"] = {
                "min": str(df[col].min()),
                "max": str(df[col].max()),
            }

        profile["columns"][col] = col_profile

    return profile

def print_profile(profile: Dict[str, Any]) -> None:
    """Print profile in readable format."""
    print("=" * 60)
    print("DATA PROFILE REPORT")
    print("=" * 60)

    print(f"\\nOVERVIEW:")
    print(f"  Rows: {profile['overview']['rows']:,}")
    print(f"  Columns: {profile['overview']['columns']}")
    print(f"  Memory: {profile['overview']['memory_usage_mb']:.2f} MB")
    print(f"  Duplicated rows: {profile['overview']['duplicated_rows']:,}")

    print(f"\\nCOLUMN DETAILS:")
    for col, details in profile["columns"].items():
        print(f"\\n  {col}:")
        print(f"    Type: {details['dtype']}")
        print(f"    Missing: {details['missing']} ({details['missing_pct']}%)")
        print(f"    Unique: {details['unique']} ({details['unique_pct']}%)")

        if "stats" in details:
            stats = details["stats"]
            print(f"    Mean: {stats['mean']}, Median: {stats['median']}")
            print(f"    Min: {stats['min']}, Max: {stats['max']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python data_profiler.py <csv_file>")
        sys.exit(1)

    df = pd.read_csv(sys.argv[1])
    profile = profile_dataframe(df)
    print_profile(profile)

    # Optionally save as JSON
    if len(sys.argv) > 2 and sys.argv[2] == "--json":
        print(json.dumps(profile, indent=2))
`,
      },
      {
        name: "quick_viz.py",
        language: "python",
        content: `#!/usr/bin/env python3
"""
Quick Visualization Generator
Creates standard visualizations for data exploration
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import sys
from pathlib import Path

def create_visualizations(df: pd.DataFrame, output_dir: str = "viz"):
    """Generate standard visualizations for a DataFrame."""

    Path(output_dir).mkdir(exist_ok=True)

    # Set style
    plt.style.use('seaborn-v0_8-whitegrid')

    # 1. Distribution of numeric columns
    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns

    if len(numeric_cols) > 0:
        fig, axes = plt.subplots(
            nrows=(len(numeric_cols) + 2) // 3,
            ncols=min(3, len(numeric_cols)),
            figsize=(15, 5 * ((len(numeric_cols) + 2) // 3))
        )
        axes = axes.flatten() if len(numeric_cols) > 1 else [axes]

        for i, col in enumerate(numeric_cols[:9]):  # Max 9 plots
            df[col].hist(ax=axes[i], bins=30, edgecolor='black')
            axes[i].set_title(f'Distribution of {col}')
            axes[i].set_xlabel(col)

        plt.tight_layout()
        plt.savefig(f'{output_dir}/distributions.png', dpi=150)
        plt.close()
        print(f"Created: {output_dir}/distributions.png")

    # 2. Correlation heatmap
    if len(numeric_cols) > 1:
        plt.figure(figsize=(12, 10))
        corr = df[numeric_cols].corr()
        sns.heatmap(corr, annot=True, cmap='coolwarm', center=0, fmt='.2f')
        plt.title('Correlation Matrix')
        plt.tight_layout()
        plt.savefig(f'{output_dir}/correlation.png', dpi=150)
        plt.close()
        print(f"Created: {output_dir}/correlation.png")

    # 3. Categorical columns bar charts
    cat_cols = df.select_dtypes(include=['object', 'category']).columns

    for col in cat_cols[:5]:  # Max 5 categorical columns
        if df[col].nunique() <= 20:  # Only if reasonable number of categories
            plt.figure(figsize=(10, 6))
            df[col].value_counts().head(15).plot(kind='bar')
            plt.title(f'Value Counts: {col}')
            plt.xlabel(col)
            plt.ylabel('Count')
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            plt.savefig(f'{output_dir}/bar_{col}.png', dpi=150)
            plt.close()
            print(f"Created: {output_dir}/bar_{col}.png")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quick_viz.py <csv_file> [output_dir]")
        sys.exit(1)

    df = pd.read_csv(sys.argv[1])
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "viz"
    create_visualizations(df, output_dir)
    print(f"\\nAll visualizations saved to {output_dir}/")
`,
      },
    ],
    references: [
      {
        name: "STATISTICAL-TESTS.md",
        content: `# Statistical Tests Quick Reference

## Choosing the Right Test

### Comparing Means

| Scenario | Test |
|----------|------|
| 2 groups, normal data | Independent t-test |
| 2 groups, non-normal | Mann-Whitney U |
| 2 paired groups | Paired t-test |
| 3+ groups | ANOVA |
| 3+ groups, non-normal | Kruskal-Wallis |

### Comparing Proportions

| Scenario | Test |
|----------|------|
| 2 proportions | Chi-square, Fisher's exact |
| Association between categoricals | Chi-square |
| Goodness of fit | Chi-square |

### Correlation

| Scenario | Test |
|----------|------|
| Linear relationship | Pearson correlation |
| Monotonic relationship | Spearman correlation |
| Ordinal data | Kendall tau |

## Interpreting P-values

| P-value | Interpretation |
|---------|----------------|
| < 0.01 | Strong evidence against null |
| 0.01-0.05 | Moderate evidence |
| 0.05-0.10 | Weak evidence |
| > 0.10 | Insufficient evidence |

**Remember:** Statistical significance ≠ practical significance!

## Effect Sizes

| Test | Effect Size | Small | Medium | Large |
|------|------------|-------|--------|-------|
| t-test | Cohen's d | 0.2 | 0.5 | 0.8 |
| ANOVA | Eta squared | 0.01 | 0.06 | 0.14 |
| Correlation | r | 0.1 | 0.3 | 0.5 |
| Chi-square | Cramér's V | 0.1 | 0.3 | 0.5 |
`,
      },
    ],
  },
  {
    id: "security-audit",
    name: "Security Audit",
    description: "Check code for security vulnerabilities",
    category: "Security",
    icon: "shield",
    customizationPrompts: [
      "What security standards should be followed (OWASP, etc.)?",
      "Should it check dependencies for vulnerabilities?",
      "What severity levels should be flagged?",
    ],
    skillMd: `---
name: security-audit
description: Audits code for security vulnerabilities including OWASP Top 10, hardcoded secrets, and insecure patterns. Use when reviewing code security or performing audits.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
---

# Security Audit Skill

## Overview
This skill performs security audits on code.

## When to Use
- When reviewing code security
- When checking for vulnerabilities
- When auditing dependencies
- When preparing for compliance

## Security Checks

### OWASP Top 10
Check for common vulnerabilities:
1. Injection flaws
2. Broken authentication
3. Sensitive data exposure
4. XML external entities
5. Broken access control
6. Security misconfiguration
7. Cross-site scripting (XSS)
8. Insecure deserialization
9. Using vulnerable components
10. Insufficient logging

### Credential Detection
Look for hardcoded:
- API keys
- Passwords
- Tokens
- Private keys

### Dependency Audit
Check dependencies for:
- Known vulnerabilities
- Outdated packages
- License issues

## Reporting
Provide findings with:
- Severity level
- Location in code
- Recommended fix
- References`,
  },
  {
    id: "refactoring",
    name: "Refactoring",
    description: "Suggest and apply code improvements",
    category: "Development",
    icon: "refresh-cw",
    customizationPrompts: [
      "What aspects should be refactored (readability, performance)?",
      "Should it maintain backwards compatibility?",
      "What design patterns do you prefer?",
    ],
    skillMd: `---
name: refactoring
description: Suggests and applies code refactoring to improve readability, performance, and maintainability. Use when asked to refactor, clean up, or improve code.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
---

# Refactoring Skill

## Overview
This skill helps refactor code for better quality.

## When to Use
- When improving code readability
- When optimizing performance
- When reducing complexity
- When applying design patterns

## Refactoring Techniques

### Extract Method
Break large functions into smaller ones:
- Identify reusable logic
- Create focused functions
- Improve naming

### Simplify Conditionals
Make conditions clearer:
- Remove nested ifs
- Use early returns
- Apply guard clauses

### Remove Duplication
Eliminate repeated code:
- Create shared utilities
- Use inheritance/composition
- Apply DRY principle

### Improve Naming
Make code self-documenting:
- Use descriptive names
- Follow conventions
- Be consistent

## Best Practices
- Make small, incremental changes
- Ensure tests pass after each change
- Document significant changes
- Review before committing`,
  },
  {
    id: "ui-skills",
    name: "UI Skills",
    description: "Opinionated constraints for building better interfaces with agents",
    category: "Design",
    icon: "palette",
    customizationPrompts: [
      "What UI framework do you use (React, Vue, Svelte)?",
      "What styling approach do you prefer (Tailwind, CSS-in-JS)?",
      "What component library do you use (shadcn/ui, Radix, MUI)?",
    ],
    skillMd: `---
name: ui-skills
description: Opinionated constraints for building better interfaces with agents.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
---

# UI Skills

Opinionated constraints for building better interfaces with agents.

## Stack

### Framework
- Use React 18+ with TypeScript
- Prefer Next.js App Router for full-stack apps
- Use Vite for client-only SPAs

### Styling
- Tailwind CSS as the primary styling solution
- Use CSS variables for theming
- Avoid inline styles except for dynamic values

### Components
- shadcn/ui as the component foundation
- Radix UI primitives for accessibility
- Lucide React for icons

## Components

### Structure
- One component per file
- Co-locate styles, tests, and types
- Export components as named exports

### Naming
- PascalCase for component names
- Descriptive names that indicate purpose
- Suffix with component type when helpful (Button, Card, Modal)

### Props
- Use TypeScript interfaces for props
- Provide sensible defaults
- Document non-obvious props

## Best Practices

### Do
- Keep UI consistent across the app
- Test on real devices
- Prioritize accessibility
- Use design tokens consistently
- Write semantic HTML

### Don't
- Override focus styles without replacement
- Use fixed pixel values for text
- Ignore keyboard users
- Skip loading/error states
- Nest components too deeply`,
  },
];

export function getTemplateById(id: string): SkillTemplate | undefined {
  return SKILL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): SkillTemplate[] {
  return SKILL_TEMPLATES.filter((t) => t.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(SKILL_TEMPLATES.map((t) => t.category))];
}
