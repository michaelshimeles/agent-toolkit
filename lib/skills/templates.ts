/**
 * Skill Templates
 * Pre-built templates for common skill use cases
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
    description: "Review code for best practices, bugs, and improvements",
    category: "Development",
    icon: "code",
    customizationPrompts: [
      "What programming languages should this focus on?",
      "What specific areas should be reviewed (security, performance, style)?",
      "Should it suggest fixes or just identify issues?",
    ],
    skillMd: `---
name: code-review
description: Reviews code for best practices, potential bugs, security issues, and suggests improvements. Use when asked to review, analyze, or improve code quality.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
---

# Code Review Skill

## Overview
This skill helps review code for quality, best practices, and potential issues.

## When to Use
- When asked to review code
- When analyzing code quality
- When looking for bugs or security issues
- When suggesting improvements

## Review Process

### 1. Initial Scan
First, scan the code for obvious issues:
- Syntax errors
- Undefined variables
- Unused imports

### 2. Best Practices Check
Review against language-specific best practices:
- Naming conventions
- Code organization
- Documentation

### 3. Security Review
Check for common security issues:
- Input validation
- SQL injection risks
- XSS vulnerabilities
- Hardcoded secrets

### 4. Performance Analysis
Identify potential performance issues:
- Inefficient algorithms
- Memory leaks
- Unnecessary computations

### 5. Provide Feedback
Format feedback clearly with:
- Issue severity (critical, warning, suggestion)
- Line numbers when applicable
- Suggested fixes

## Output Format
Provide a structured review with sections for:
1. Summary
2. Critical Issues
3. Warnings
4. Suggestions
5. Positive Observations`,
  },
  {
    id: "documentation",
    name: "Documentation",
    description: "Generate and maintain code documentation",
    category: "Development",
    icon: "file-text",
    customizationPrompts: [
      "What documentation format do you prefer (JSDoc, Sphinx, etc.)?",
      "Should it generate README files?",
      "What level of detail is needed?",
    ],
    skillMd: `---
name: documentation
description: Generates comprehensive documentation for code including function docs, README files, and API references. Use when asked to document code or create documentation.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
---

# Documentation Skill

## Overview
This skill generates and maintains documentation for codebases.

## When to Use
- When asked to document code
- When creating README files
- When generating API documentation
- When adding inline comments

## Documentation Types

### Function Documentation
Generate documentation for functions including:
- Description
- Parameters with types
- Return values
- Examples
- Exceptions/errors

### README Generation
Create comprehensive README files with:
- Project overview
- Installation instructions
- Usage examples
- API reference
- Contributing guidelines

### API Documentation
Document APIs with:
- Endpoint descriptions
- Request/response formats
- Authentication requirements
- Error codes

## Best Practices
- Keep documentation up to date with code
- Use clear, concise language
- Include practical examples
- Document edge cases`,
  },
  {
    id: "testing",
    name: "Testing Helper",
    description: "Write and improve tests for code",
    category: "Development",
    icon: "check-circle",
    customizationPrompts: [
      "What testing framework do you use?",
      "What types of tests are needed (unit, integration, e2e)?",
      "What is your target code coverage?",
    ],
    skillMd: `---
name: testing-helper
description: Helps write comprehensive tests including unit tests, integration tests, and end-to-end tests. Use when asked to write tests, improve test coverage, or review test quality.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
allowed-tools: Bash(npm:test) Bash(npx:vitest) Bash(npx:jest) Read Write
---

# Testing Helper Skill

## Overview
This skill helps create and improve tests for codebases.

## When to Use
- When asked to write tests
- When improving test coverage
- When reviewing test quality
- When debugging failing tests

## Test Types

### Unit Tests
Test individual functions and components:
- Mock dependencies
- Test edge cases
- Verify return values
- Check error handling

### Integration Tests
Test component interactions:
- Database operations
- API endpoints
- Service integrations

### End-to-End Tests
Test complete user flows:
- Critical paths
- Common scenarios
- Error scenarios

## Test Writing Guidelines

### Structure
1. Arrange - Set up test data
2. Act - Execute the code
3. Assert - Verify results

### Naming
Use descriptive test names:
- \`should return empty array when no items exist\`
- \`should throw error when user is not authenticated\`

### Coverage
Aim to test:
- Happy paths
- Edge cases
- Error conditions
- Boundary values`,
  },
  {
    id: "git-workflow",
    name: "Git Workflow",
    description: "Manage git operations and PR workflows",
    category: "Development",
    icon: "git-branch",
    customizationPrompts: [
      "What is your branching strategy (gitflow, trunk-based)?",
      "What commit message format do you use?",
      "Should it handle PR reviews?",
    ],
    skillMd: `---
name: git-workflow
description: Manages git operations including commits, branches, and pull requests. Use when working with git, creating commits, or managing branches.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
allowed-tools: Bash(git:*)
---

# Git Workflow Skill

## Overview
This skill helps manage git operations and workflows.

## When to Use
- When creating commits
- When managing branches
- When preparing pull requests
- When resolving conflicts

## Commit Guidelines

### Commit Message Format
\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

### Types
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

## Branch Naming
- feature/description
- bugfix/issue-number
- hotfix/description
- release/version

## Pull Request Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Commits squashed if needed`,
  },
  {
    id: "api-integration",
    name: "API Integration",
    description: "Connect to and interact with external APIs",
    category: "Integration",
    icon: "link",
    customizationPrompts: [
      "What APIs will you be integrating with?",
      "What authentication methods are used?",
      "Should it handle rate limiting?",
    ],
    skillMd: `---
name: api-integration
description: Helps integrate with external APIs including authentication, request handling, and error management. Use when connecting to APIs or building integrations.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
---

# API Integration Skill

## Overview
This skill helps integrate with external APIs.

## When to Use
- When connecting to APIs
- When handling authentication
- When parsing responses
- When managing errors

## Integration Steps

### 1. Authentication
Set up proper authentication:
- API keys
- OAuth flows
- Bearer tokens
- Basic auth

### 2. Request Building
Build requests properly:
- Set correct headers
- Format request body
- Handle query parameters

### 3. Response Handling
Process responses:
- Parse JSON/XML
- Handle pagination
- Transform data

### 4. Error Management
Handle errors gracefully:
- Retry on failures
- Log errors
- Provide meaningful messages

## Best Practices
- Store credentials securely
- Implement rate limiting
- Cache responses when appropriate
- Use timeouts`,
  },
  {
    id: "data-analysis",
    name: "Data Analysis",
    description: "Analyze and visualize data",
    category: "Data",
    icon: "bar-chart",
    customizationPrompts: [
      "What types of data will you analyze?",
      "What visualization tools do you use?",
      "Should it generate reports?",
    ],
    skillMd: `---
name: data-analysis
description: Analyzes data sets, generates statistics, and creates visualizations. Use when asked to analyze data, find patterns, or create reports.
license: MIT
metadata:
  author: user
  version: "1.0"
compatibility: Designed for Claude Code
allowed-tools: Bash(python:*) Read Write
---

# Data Analysis Skill

## Overview
This skill helps analyze data and generate insights.

## When to Use
- When analyzing datasets
- When finding patterns
- When generating statistics
- When creating visualizations

## Analysis Process

### 1. Data Loading
Load and validate data:
- Check data types
- Handle missing values
- Identify outliers

### 2. Exploration
Explore the data:
- Summary statistics
- Distributions
- Correlations

### 3. Analysis
Perform analysis:
- Statistical tests
- Trend analysis
- Pattern recognition

### 4. Visualization
Create visualizations:
- Charts and graphs
- Tables
- Dashboards

### 5. Reporting
Generate reports:
- Key findings
- Recommendations
- Next steps`,
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

### Composition
- Prefer composition over configuration
- Use render props or children for flexibility
- Keep components focused and single-purpose

## Interaction

### Feedback
- Provide immediate visual feedback for all interactions
- Use loading states for async operations
- Show error states clearly with recovery options

### States
- Handle all states: default, hover, focus, active, disabled
- Use \`focus-visible\` for keyboard focus
- Maintain consistent state indicators

### Accessibility
- Use semantic HTML elements
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers

## Animation

### Principles
- Animations should be purposeful, not decorative
- Keep durations between 150-300ms for UI feedback
- Use ease-out for entering, ease-in for exiting

### Implementation
- Use CSS transitions for simple animations
- Use Framer Motion for complex sequences
- Respect \`prefers-reduced-motion\`

### Common Patterns
\`\`\`css
/* Micro-interaction */
transition: transform 150ms ease-out, opacity 150ms ease-out;

/* Content reveal */
transition: opacity 200ms ease-out, transform 200ms ease-out;

/* Modal/overlay */
transition: opacity 250ms ease-out;
\`\`\`

## Typography

### Scale
Use a consistent type scale:
- xs: 0.75rem (12px)
- sm: 0.875rem (14px)
- base: 1rem (16px)
- lg: 1.125rem (18px)
- xl: 1.25rem (20px)
- 2xl: 1.5rem (24px)
- 3xl: 1.875rem (30px)
- 4xl: 2.25rem (36px)

### Line Height
- Headings: 1.2-1.3
- Body text: 1.5-1.6
- UI elements: 1.25

### Font Weight
- Regular (400) for body
- Medium (500) for emphasis
- Semibold (600) for headings
- Bold (700) sparingly

## Layout

### Spacing
Use a consistent spacing scale (multiples of 4px):
- 1: 0.25rem (4px)
- 2: 0.5rem (8px)
- 3: 0.75rem (12px)
- 4: 1rem (16px)
- 6: 1.5rem (24px)
- 8: 2rem (32px)
- 12: 3rem (48px)

### Grid
- Use CSS Grid for page layouts
- Use Flexbox for component layouts
- Max content width: 1280px
- Use consistent gutters

### Responsive
- Mobile-first approach
- Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)
- Test at all breakpoints

## Performance

### Images
- Use next/image or optimized loaders
- Provide width and height
- Use appropriate formats (WebP, AVIF)
- Lazy load below-the-fold images

### Loading
- Implement skeleton loaders
- Use Suspense boundaries
- Prefetch critical resources
- Minimize layout shift

### Bundle
- Code-split routes
- Lazy load heavy components
- Tree-shake unused code
- Monitor bundle size

## Design Tokens

### Colors
Define semantic color tokens:
\`\`\`css
--background: /* page background */
--foreground: /* primary text */
--muted: /* secondary text */
--border: /* borders and dividers */
--primary: /* primary actions */
--primary-foreground: /* text on primary */
--destructive: /* error/danger states */
--accent: /* highlights */
\`\`\`

### Shadows
\`\`\`css
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px rgb(0 0 0 / 0.1);
\`\`\`

### Borders
\`\`\`css
--radius-sm: 0.25rem;
--radius-md: 0.375rem;
--radius-lg: 0.5rem;
--radius-full: 9999px;
\`\`\`

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
