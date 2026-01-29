# Skills & MCP: Building Better AI Tools

This document summarizes key learnings from Claude's documentation on Skills and MCP (Model Context Protocol) to guide improvements for our toolkit's skill and MCP creation experience.

---

## Core Concepts

### What Are Skills?
Skills are **procedural knowledge** that teach Claude how to do things. They encode expertise, workflows, and best practices into reusable modules that Claude can invoke on demand.

**Key characteristics:**
- Contain instructions, patterns, and domain knowledge
- Use progressive disclosure (~100 tokens metadata loads immediately, full instructions <5k tokens load on-demand)
- Stored as folders with `SKILL.md` as the main file
- Can include scripts, references, documentation, and assets

### What Is MCP?
MCP (Model Context Protocol) provides **tool and data connectivity** - secure access to external systems, APIs, and data sources.

**Key characteristics:**
- Defines a standard interface for tools Claude can use
- Handles authentication and data access
- Provides real-time connectivity to external services
- Runs as local servers that Claude can interact with

### How They Work Together
**Skills = Expertise | MCP = Connectivity**

The relationship is complementary:
- **One skill can orchestrate multiple MCP servers** (e.g., a deployment skill that uses GitHub, AWS, and Slack MCPs)
- **One MCP server can support many skills** (e.g., a GitHub MCP used by code review, PR creation, and issue management skills)
- Skills define the "how" and "why"; MCP provides the "what" (tools and data)

---

## Skill Structure

```
skill-name/
├── SKILL.md          # Main instructions with YAML frontmatter
├── docs.md           # Additional documentation (optional)
├── references/       # Reference files, examples, templates
├── scripts/          # Executable scripts the skill can run
└── assets/           # Images, data files, etc.
```

### SKILL.md Format
```markdown
---
name: skill-name
description: One-line description for when skill loads
version: "1.0"
license: MIT
---

# Skill Title

Detailed instructions, workflows, and patterns go here.
```

### Progressive Disclosure
This is critical for efficiency:
1. **Metadata (~100 tokens)** - Name, description, triggers - loads immediately
2. **Full instructions (<5k tokens)** - Complete skill content - loads only when invoked

This allows Claude to know about hundreds of skills without context bloat.

---

## Skills vs Other Approaches

| Approach | Best For | Limitations |
|----------|----------|-------------|
| **Skills** | Complex workflows, domain expertise, reusable patterns | Requires understanding of skill structure |
| **System Prompts** | Session-wide context, personality | Limited length, no structure |
| **Projects** | Collection of related files | No procedural knowledge |
| **Custom Instructions** | Personal preferences | No domain expertise |
| **Subagents** | Parallel specialized tasks | More complex to orchestrate |

**When to use Skills:**
- Teaching Claude a specific methodology
- Encoding company/team processes
- Creating reusable workflow templates
- Providing domain-specific expertise

---

## MCP Server Configuration

### Basic MCP Config (claude_desktop_config.json)
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-name"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

### MCP Server Types
1. **stdio servers** - Communicate via stdin/stdout (most common)
2. **SSE servers** - Server-sent events over HTTP

### Environment Variables
- MCP servers can access environment variables for API keys
- Variables can be inherited or explicitly set in config

---

## Improving Our Toolkit UX

### 1. Interview Flow for Skill Creation
Based on the documentation, effective skills need:
- Clear scope and purpose
- Well-defined triggers/invocation patterns
- Step-by-step workflows
- Example outputs or templates

**Recommendation:** Our chat-based creator should gather:
- What problem does this skill solve?
- What tools/MCPs might it need?
- What's the step-by-step workflow?
- Any example inputs/outputs?
- Documentation or repos to reference?

### 2. MCP + Skill Bundling
Since skills often need MCP connectivity, consider:
- Suggesting relevant MCPs when creating certain skill types
- Pre-built skill+MCP combinations for common use cases
- Templates that include both skill instructions and MCP requirements

### 3. Progressive Disclosure in UI
Mirror Claude's progressive disclosure:
- Show skill summary/metadata in list views
- Full content only when editing/viewing details
- Preview mode that shows what Claude sees

### 4. Skill Testing
Allow users to:
- Preview how their skill will be interpreted
- Test skill invocation with sample prompts
- See token usage (metadata vs full content)

### 5. Version Control
Skills benefit from versioning:
- Track changes over time
- Rollback to previous versions
- A/B test different skill approaches

---

## Common Skill Patterns

### 1. Workflow Skills
Encode multi-step processes:
```markdown
# Deployment Workflow

## When to use
User asks to deploy, release, or ship code

## Steps
1. Run tests
2. Build artifacts
3. Deploy to staging
4. Run smoke tests
5. Deploy to production
6. Notify team
```

### 2. Template Skills
Generate consistent outputs:
```markdown
# PR Review Skill

## Output Format
Always structure reviews as:
- Summary
- Code Quality
- Security Concerns
- Suggestions
- Approval Status
```

### 3. Integration Skills
Orchestrate multiple tools:
```markdown
# Issue Triage Skill

## MCP Dependencies
- GitHub MCP (for issues)
- Slack MCP (for notifications)
- Linear MCP (for project tracking)

## Workflow
1. Fetch new issues from GitHub
2. Categorize by type/priority
3. Create Linear tickets
4. Notify relevant Slack channels
```

---

## Key Takeaways

1. **Skills encode expertise; MCP provides connectivity** - They're complementary, not competing

2. **Progressive disclosure is essential** - Keep metadata light (~100 tokens), instructions focused (<5k)

3. **One skill can use many MCPs** - Design skills around workflows, not tools

4. **Interview users thoroughly** - Good skills need clear scope, triggers, workflows, and examples

5. **Test and iterate** - Skills benefit from refinement based on actual usage

6. **Open standard** - MCP is adopted by Claude Code, GitHub Copilot, Cursor, Windsurf, and others

---

## Resources

- [Skills + MCP Blog Post](https://claude.com/blog/extending-claude-capabilities-with-skills-mcp-servers)
- [Skills Explained](https://claude.com/blog/skills-explained)
- [Building Agents with Skills](https://claude.com/blog/building-agents-with-skills-equipping-agents-for-specialized-work)
- [MCP Documentation](https://code.claude.com/docs/en/mcp)
- [MCP Servers Directory](https://mcpservers.org)
- [MCP Specification](https://modelcontextprotocol.io)
