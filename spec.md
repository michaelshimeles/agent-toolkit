# AI Skill Builder - Feature Specification

## Overview

A new feature that enables users to create, preview, and deploy Agent Skills to GitHub using AI-powered natural language generation. Skills can then be used in Claude Code and other compatible AI agents.

## What Are Agent Skills?

Agent Skills are folders of instructions, scripts, and resources that AI agents can discover and use to perform tasks more accurately. They follow the open [Agent Skills specification](https://agentskills.io) created by Anthropic.

### Skill Structure

```
skill-name/
├── SKILL.md          # Required - Instructions and metadata
├── scripts/          # Optional - Executable code (Python, Bash, JS)
├── references/       # Optional - Additional documentation
└── assets/           # Optional - Static resources (templates, data)
```

### SKILL.md Format

```yaml
---
name: skill-name
description: What this skill does and when to use it.
license: MIT
metadata:
  author: username
  version: "1.0"
compatibility: Designed for Claude Code
allowed-tools: Bash(git:*) Read Write
---

# Instructions

Step-by-step instructions for the agent...
```

---

## Feature Requirements

### 1. User Input Method

**Approach**: Natural Language Description

Users describe what they want the skill to do in plain English. The AI generates the complete skill package including:

- `SKILL.md` with proper frontmatter and instructions
- Scripts in `scripts/` directory if needed
- Reference documentation in `references/` if needed
- Static assets in `assets/` if needed

**Example Input**:
> "Create a skill that helps review Python code for security vulnerabilities. It should check for common issues like SQL injection, hardcoded secrets, and insecure dependencies. Include a Python script that can scan files."

**Generated Output**:
```
python-security-review/
├── SKILL.md
├── scripts/
│   └── scan.py
└── references/
    └── OWASP_TOP_10.md
```

---

### 2. Dashboard Location

**Route**: `/dashboard/skills`

New dedicated dashboard section for skill management, separate from the existing AI Builder.

**Navigation Structure**:
```
Dashboard
├── Integrations
├── Builder (existing - MCP servers)
├── Skills (new)
│   ├── My Skills
│   ├── Templates
│   └── Examples Gallery
├── API Keys
├── Usage
└── Logs
```

---

### 3. Skill Creation Workflow

#### Step 1: Describe Your Skill

- Large text input for natural language description
- Optional: Select a template as starting point
- Optional: Browse example gallery for inspiration

#### Step 2: AI Generation

- Claude generates complete skill package
- Real-time streaming of generation progress
- Validation against Agent Skills specification

#### Step 3: Preview & Edit

**Two Preview Modes**:

1. **Simulated Usage Panel**
   - Shows how the skill will appear to Claude Code
   - Simulates agent discovery and activation
   - Demonstrates example usage scenarios

2. **File Tree Explorer**
   - Displays generated folder structure
   - Monaco editor for viewing/editing each file
   - Syntax highlighting for YAML, Markdown, Python, etc.

#### Step 4: Iterate (Optional)

- Chat-based refinement interface
- User can request modifications: "Add error handling to the script" or "Make the instructions more detailed"
- AI updates the skill based on feedback
- Version history tracks all iterations

#### Step 5: Deploy to GitHub

**Deployment Options** (user chooses per skill):

1. **New Repository**
   - Creates new repo under user's GitHub account
   - Repo name matches skill name
   - Includes README with usage instructions

2. **Existing Repository**
   - User selects from their repos
   - Skill added as directory in chosen location
   - Creates PR or direct commit (user preference)

---

### 4. GitHub Integration

**Authentication**: Leverage existing GitHub OAuth integration from the platform.

**Required Scopes**:
- `repo` - Full repository access
- `public_repo` - Public repository access (minimum for public skills)

**Deployment Flow**:
1. User clicks "Deploy to GitHub"
2. Select deployment target (new repo or existing)
3. Confirm repository name and visibility
4. Platform creates/pushes skill files
5. Display success with repository URL

---

### 5. Local Storage & Versioning

**Database**: Convex (existing infrastructure)

**New Table**: `skills`

```typescript
// convex/schema.ts addition
skills: defineTable({
  userId: v.id("users"),
  name: v.string(),
  description: v.string(),
  status: v.union(
    v.literal("draft"),
    v.literal("deployed"),
    v.literal("archived")
  ),
  files: v.object({
    skillMd: v.string(),
    scripts: v.optional(v.array(v.object({
      name: v.string(),
      content: v.string(),
      language: v.string(),
    }))),
    references: v.optional(v.array(v.object({
      name: v.string(),
      content: v.string(),
    }))),
    assets: v.optional(v.array(v.object({
      name: v.string(),
      content: v.string(),
      type: v.string(),
    }))),
  }),
  githubRepo: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
  deployedAt: v.optional(v.number()),
  metadata: v.object({
    license: v.optional(v.string()),
    version: v.string(),
    allowedTools: v.optional(v.array(v.string())),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_user", ["userId"])
.index("by_status", ["status"])
.index("by_name", ["userId", "name"]),

skillVersions: defineTable({
  skillId: v.id("skills"),
  version: v.number(),
  files: v.object({...}), // Same structure as skills.files
  changeDescription: v.optional(v.string()),
  createdAt: v.number(),
})
.index("by_skill", ["skillId"])
.index("by_skill_version", ["skillId", "version"]),
```

**Version Control Features**:
- Automatic version creation on each save
- View version history
- Restore previous versions
- Compare versions (diff view)

---

### 6. Templates & Examples

#### Curated Templates

Pre-built skill templates for common use cases:

| Template | Description |
|----------|-------------|
| Code Review | Review code for best practices and issues |
| Documentation | Generate and maintain documentation |
| Testing Helper | Write and run tests |
| Git Workflow | Manage git operations and PR workflows |
| API Integration | Connect to external APIs |
| Data Analysis | Analyze and visualize data |
| Security Audit | Check for security vulnerabilities |
| Refactoring | Suggest and apply code improvements |

Each template includes:
- Pre-filled SKILL.md structure
- Example scripts (where applicable)
- Customization prompts

#### Example Gallery

Display existing public skills from:
- Official Anthropic skills repository
- Community-contributed skills (curated)
- Featured skills with high usage

Gallery features:
- Search and filter by category
- Preview skill contents
- "Use as Template" button
- Star/favorite skills

---

### 7. Script Generation

#### AI-Generated Scripts

When the skill requires executable code:

1. AI analyzes skill requirements
2. Generates appropriate scripts (Python, Bash, JavaScript)
3. Includes proper error handling
4. Follows security best practices
5. Adds inline documentation

**Supported Languages**:
- Python 3.x
- Bash
- JavaScript/Node.js

#### User-Uploaded Scripts

Users can also:
- Upload their own scripts
- Edit AI-generated scripts
- Mix AI and custom scripts

**Script Editor**:
- Monaco editor with language support
- Syntax highlighting
- Basic linting/validation
- Run script locally (sandboxed)

---

### 8. Post-Deployment Experience

After successful GitHub deployment, display:

#### Usage Instructions Panel

```markdown
## Your Skill is Live!

**Repository**: https://github.com/username/python-security-review

### Add to Claude Code

Add this to your Claude Code settings:

```json
{
  "skills": [
    "https://github.com/username/python-security-review"
  ]
}
```

### Or use the CLI

```bash
claude skills add https://github.com/username/python-security-review
```

### Test Your Skill

In Claude Code, try:
> "Review my Python code for security issues"

Claude will automatically discover and use your skill!
```

#### Quick Actions

- **View on GitHub** - Opens repository
- **Edit Skill** - Return to editor
- **Share** - Copy shareable link
- **Create Another** - Start new skill

---

### 9. AI Generation Implementation

#### Claude Prompt Structure

```typescript
const systemPrompt = `You are an expert at creating Agent Skills for AI agents like Claude Code.

Agent Skills follow this specification:
- Must have a SKILL.md file with YAML frontmatter
- Name: lowercase, hyphens only, max 64 chars
- Description: max 1024 chars, explain what AND when to use
- Body: Clear instructions, keep under 500 lines

When generating skills:
1. Create clear, actionable instructions
2. Include edge cases and error handling
3. Generate scripts only when necessary
4. Use progressive disclosure (defer details to references)
5. Follow security best practices

Output format: JSON with structure:
{
  "name": "skill-name",
  "files": {
    "SKILL.md": "content...",
    "scripts": [{"name": "script.py", "content": "..."}],
    "references": [{"name": "GUIDE.md", "content": "..."}],
    "assets": []
  }
}`;
```

#### Generation Pipeline

1. **Parse Input**: Extract key requirements from user description
2. **Select Template**: If user started from template, use as base
3. **Generate Structure**: Determine needed files (scripts, references)
4. **Generate SKILL.md**: Create frontmatter and instructions
5. **Generate Scripts**: If needed, create executable code
6. **Generate References**: If complex, create supporting docs
7. **Validate**: Check against Agent Skills specification
8. **Return**: Stream results to UI

#### Validation Rules

- `name` matches directory name
- `name` is lowercase with hyphens only
- `description` is present and descriptive
- SKILL.md is under 500 lines
- Scripts have proper file extensions
- No hardcoded secrets in scripts

---

### 10. Security Considerations

#### Generated Code Scanning

Reuse existing security scanning from AI Builder:

- Detect hardcoded credentials
- Check for injection vulnerabilities
- Validate sandbox compliance
- Flag suspicious patterns

#### GitHub Token Security

- Use existing OAuth token encryption
- Request minimum necessary scopes
- Token refresh handling
- Secure storage in Convex

#### Skill Content Validation

- Sanitize user inputs
- Validate YAML frontmatter
- Check script safety before deployment
- Warn about sensitive operations

---

## Technical Architecture

### New Files

```
/app/dashboard/skills/
├── page.tsx                    # Skills list page
├── new/
│   └── page.tsx               # Create new skill
├── [skillId]/
│   ├── page.tsx               # View/edit skill
│   └── versions/
│       └── page.tsx           # Version history
├── templates/
│   └── page.tsx               # Template gallery
└── examples/
    └── page.tsx               # Example gallery

/components/skills/
├── skill-editor.tsx           # Main editor component
├── skill-preview.tsx          # Preview panel
├── skill-chat.tsx             # Refinement chat
├── file-tree.tsx              # File explorer
├── template-card.tsx          # Template display
└── deployment-dialog.tsx      # GitHub deployment

/convex/
├── skills.ts                  # Skill CRUD operations
├── skillVersions.ts           # Version management
└── skillGeneration.ts         # AI generation actions

/lib/
├── skills/
│   ├── generator.ts           # Skill generation logic
│   ├── validator.ts           # Spec validation
│   ├── templates.ts           # Template definitions
│   └── github-deploy.ts       # GitHub deployment
```

### API Endpoints (Convex Actions)

```typescript
// Skill CRUD
skills.create(input: string, templateId?: string)
skills.update(skillId: Id, files: SkillFiles)
skills.delete(skillId: Id)
skills.list(userId: Id)
skills.get(skillId: Id)

// AI Generation
skillGeneration.generate(description: string)
skillGeneration.refine(skillId: Id, feedback: string)
skillGeneration.regenerate(skillId: Id, section: string)

// Version Management
skillVersions.create(skillId: Id, changeDescription?: string)
skillVersions.list(skillId: Id)
skillVersions.restore(skillId: Id, version: number)

// GitHub Deployment
skills.deployToNewRepo(skillId: Id, repoName: string, visibility: string)
skills.deployToExistingRepo(skillId: Id, repoFullName: string, path: string)
```

---

## UI/UX Specifications

### Skills Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Skills                                      [+ New Skill]  │
├─────────────────────────────────────────────────────────────┤
│  [My Skills] [Templates] [Examples]                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ python-security │  │ doc-generator   │                   │
│  │ ────────────────│  │ ────────────────│                   │
│  │ Security review │  │ Auto-generate   │                   │
│  │ for Python code │  │ documentation   │                   │
│  │                 │  │                 │                   │
│  │ ⬤ Deployed     │  │ ○ Draft         │                   │
│  │ GitHub ↗       │  │ [Deploy]        │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Skill Editor

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    python-security-review           [Save] [Deploy] │
├────────────────────────────┬────────────────────────────────┤
│  Files                     │  Preview                       │
│  ─────                     │  ───────                       │
│  📁 python-security-review │  [Simulated Usage] [File View] │
│    📄 SKILL.md ←          │  ┌────────────────────────────┐ │
│    📁 scripts             │  │ How Claude Code sees it:   │ │
│      📄 scan.py           │  │                            │ │
│    📁 references          │  │ Name: python-security-rev  │ │
│      📄 OWASP.md          │  │ Desc: Reviews Python code  │ │
│                            │  │       for security issues  │ │
├────────────────────────────┤  │                            │ │
│  Editor                    │  │ Triggered by:              │ │
│  ──────                    │  │ "security", "vulnerabil.." │ │
│  ```yaml                   │  │                            │ │
│  ---                       │  │ [Simulate Activation]      │ │
│  name: python-security...  │  └────────────────────────────┘ │
│  description: Reviews...   │                                 │
│  ---                       │                                 │
│                            │                                 │
│  # Instructions            │                                 │
│  ...                       │                                 │
│  ```                       │                                 │
├────────────────────────────┴────────────────────────────────┤
│  💬 Refine with AI                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Add more detailed error messages when vulnerabilities  │ │
│  │ are found...                                    [Send] │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Dialog

```
┌─────────────────────────────────────────────┐
│  Deploy to GitHub                           │
├─────────────────────────────────────────────┤
│                                             │
│  ○ Create new repository                    │
│    Repository name: python-security-review  │
│    Visibility: ● Public  ○ Private          │
│                                             │
│  ○ Add to existing repository               │
│    Select repository: [dropdown]            │
│    Path: /skills/                           │
│                                             │
│  [Cancel]                      [Deploy →]   │
└─────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Skills created per user | 3+ average |
| Deployment success rate | > 95% |
| Time to first skill | < 5 minutes |
| User satisfaction | > 4.5/5 |
| Skills deployed to GitHub | > 80% of created |

---

## Implementation Phases

### Phase 1: Core Generation
- Natural language input
- SKILL.md generation
- Basic preview (file view)
- Local storage (drafts)

### Phase 2: Full Editor
- Monaco editor integration
- Script generation
- Reference file support
- Version history

### Phase 3: GitHub Integration
- OAuth flow for deployment
- New repo creation
- Existing repo deployment
- Post-deployment guide

### Phase 4: Templates & Gallery
- Curated templates
- Example gallery
- Community features
- Search/filter

### Phase 5: Advanced Features
- Chat-based refinement
- Simulated usage preview
- Security scanning
- Analytics

---

## Dependencies

### Existing Infrastructure
- Convex database and actions
- GitHub OAuth integration (`/server/integrations/github.ts`)
- Claude API integration (`/lib/claude.ts`)
- Monaco editor (`/components/code-editor.tsx`)
- Security scanning (`/lib/security.ts`)

### New Dependencies
- None required - leverages existing stack

---

## Open Questions

1. **Skill discoverability**: Should we create a public skill registry/marketplace?
2. **Monetization**: Should premium templates or features be gated?
3. **Collaboration**: Should skills support team editing like generated servers do?
4. **Forking**: Should users be able to fork/remix public skills?

---

## Appendix: Agent Skills Specification Reference

### Required Frontmatter Fields

| Field | Constraints |
|-------|-------------|
| `name` | Max 64 chars, lowercase, hyphens only |
| `description` | Max 1024 chars, must explain what AND when |

### Optional Frontmatter Fields

| Field | Description |
|-------|-------------|
| `license` | License name (e.g., MIT, Apache-2.0) |
| `compatibility` | Environment requirements |
| `metadata` | Key-value pairs (author, version, etc.) |
| `allowed-tools` | Pre-approved tools list |

### Directory Structure

```
skill-name/
├── SKILL.md          # Required
├── scripts/          # Optional - executable code
├── references/       # Optional - additional docs
└── assets/           # Optional - static resources
```

### Token Budget Guidelines

- Metadata: ~100 tokens (loaded at startup)
- Instructions: <5000 tokens (loaded on activation)
- Resources: On-demand (loaded when referenced)
