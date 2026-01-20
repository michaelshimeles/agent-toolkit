# Toolkit

> Build MCP servers and Claude Code skills with AI.

## Overview

Toolkit is a platform for creating AI agent tools. Generate MCP servers from any API documentation using AI, or build custom skills that extend Claude Code's capabilities.

## Features

### MCP Server Builder

Generate MCP servers automatically from:
- **OpenAPI Specs**: Paste a URL to any OpenAPI/Swagger specification
- **Documentation URLs**: Point to API documentation pages
- **GitHub Repos**: Analyze repositories to extract API patterns

The AI analyzes your input, extracts API endpoints, and generates a fully functional MCP server with typed tools.

### Agent Skills

Create custom skills for Claude Code:
- **SKILL.md**: Define instructions and knowledge for Claude
- **Scripts**: Add Python, Bash, or JavaScript utilities
- **References**: Include documentation and examples
- **Version History**: Track changes with automatic versioning

Deploy skills to GitHub for easy sharing and installation.

### One-Click Deployment

Deploy generated MCP servers to Vercel with a single click:
- Automatic project creation
- Environment variable configuration
- Health check validation
- Real-time deployment status

### Dashboard

- **API Keys**: Create and manage authentication keys
- **Usage Analytics**: Track requests, errors, and latency
- **Activity Logs**: Debug recent tool calls

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Convex (real-time database + serverless functions)
- **Auth**: Clerk
- **Code Editor**: Monaco Editor
- **AI**: Claude API (Anthropic SDK)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account
- A Clerk account
- An Anthropic API key (for AI generation)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd toolkit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# .env.local
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>
CLERK_WEBHOOK_SECRET=<your-clerk-webhook-secret>
ENCRYPTION_KEY=<random-32-char-string>
ANTHROPIC_API_KEY=<your-claude-api-key>
VERCEL_TOKEN=<your-vercel-token>  # Optional, for deployment
```

4. Initialize Convex:
```bash
npx convex dev
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
toolkit/
├── app/
│   ├── page.tsx                # Landing page
│   ├── dashboard/
│   │   ├── page.tsx            # Dashboard home
│   │   ├── builder/            # MCP Server Builder
│   │   │   ├── page.tsx        # Server list
│   │   │   ├── new/            # Create new server
│   │   │   └── [serverId]/     # Server editor
│   │   ├── skills/             # Agent Skills
│   │   │   ├── page.tsx        # Skills list
│   │   │   ├── new/            # Create new skill
│   │   │   └── [skillId]/      # Skill editor
│   │   ├── api-keys/           # API key management
│   │   └── usage/              # Analytics
│   └── api/                    # API routes
├── convex/                     # Backend functions & schema
├── components/                 # React components
└── lib/                        # Utilities
```

## Testing

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm run test:ui       # Visual test UI
```

## License

MIT
