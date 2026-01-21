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

- **MCP Builder**: Create and manage MCP servers
- **Skills**: Build and deploy agent skills
- **API Keys**: Create and manage authentication keys
- **Settings**: Configure your own Anthropic API key (BYOK)

### Bring Your Own Key (BYOK)

Use your own Anthropic API key for AI generation:
- Securely encrypted storage
- Keys never leave your account
- Full control over your API usage

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Convex (real-time database + serverless functions)
- **API Server**: Elysia (with Swagger documentation)
- **Auth**: Clerk
- **Code Editor**: Monaco Editor
- **AI**: Claude API (Anthropic SDK)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account
- A Clerk account
- An Anthropic API key (optional - users can provide their own)

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
INTERNAL_API_SECRET=<random-secret-for-internal-apis>
ANTHROPIC_API_KEY=<your-claude-api-key>  # Optional fallback
VERCEL_TOKEN=<your-vercel-token>         # Optional, for deployment
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
│   │   │   ├── [skillId]/      # Skill editor
│   │   │   └── templates/      # Skill templates
│   │   ├── api-keys/           # API key management
│   │   ├── settings/           # User settings (BYOK)
│   │   ├── integrations/       # Manage integrations
│   │   ├── logs/               # Activity logs
│   │   └── usage/              # Usage analytics
│   └── api/                    # Next.js API routes
├── server/                     # Elysia API server
│   ├── index.ts                # Main server entry
│   ├── gateway.ts              # MCP gateway
│   ├── settings.ts             # User settings API
│   ├── oauth.ts                # OAuth flows
│   └── webhooks.ts             # Webhook handlers
├── convex/                     # Backend functions & schema
├── components/                 # React components
└── lib/                        # Utilities
```

## API Documentation

The API is documented with Swagger. After starting the dev server, visit:
- `/api/swagger` - Interactive API documentation

## Testing

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm run test:ui       # Visual test UI
```

## License

MIT
