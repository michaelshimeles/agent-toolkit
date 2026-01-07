# MCP Hub

> The unified integration layer for AI agents. Connect once, access everything.

## Overview

MCP Hub is a platform that allows AI agents (Claude, GPT, etc.) to connect to multiple services through a single, unified MCP endpoint. Users configure one connection and get access to GitHub, Linear, Notion, Slack, and any other integrated service.

## Features

### Core Infrastructure

- **MCP Gateway**: Single endpoint that routes to underlying integration servers
- **Integration Runtime**: MCP servers as Vercel Functions with HTTP transport
- **Registry Database**: Integrations catalog, user accounts, API keys, and usage tracking
- **Real-time Updates**: Live dashboard updates using Convex

### Current Integrations

- **GitHub**: Full integration with 8 tools including:
  - Create issues and pull requests
  - List repositories and issues
  - Search code across GitHub
  - And more...

- **Linear**: Complete integration with 7 tools:
  - Create and update issues
  - List issues with filtering
  - Manage teams and projects
  - Search across Linear

- **Notion**: Comprehensive integration with 9 tools:
  - Search pages and databases
  - Create and update pages
  - Query databases
  - Manage content blocks

- **Slack**: Complete integration with 10 tools:
  - Send messages to channels
  - List and manage channels
  - Search messages
  - Manage users and reactions

- **PostgreSQL**: Database integration with 8 tools:
  - Execute SQL queries
  - List tables and schemas
  - Describe table structure
  - Get table statistics and sizes
  - Monitor active queries
  - List databases

- **Google Drive**: File storage integration with 10 tools:
  - List and search files
  - Get file details and download content
  - Create files and folders
  - Update and delete files
  - Share files with users
  - Export Google Workspace files

- **Gmail**: Email integration with 12 tools:
  - List and search messages
  - Send and reply to emails
  - Manage drafts and labels
  - Delete and trash messages
  - Get attachments
  - Thread management

- **Jira**: Project management integration with 12 tools:
  - List projects and issues
  - Create and update issues
  - Add comments and transitions
  - Assign issues to users
  - Search users and boards
  - JQL query support

- **Airtable**: Database integration with 10 tools:
  - List bases and schemas
  - List and get records
  - Create and update records (single and batch)
  - Delete records (single and batch)
  - Filter by formula
  - Sort and pagination

- **Stripe**: Payment processing integration with 12 tools:
  - List and manage customers
  - List and get invoices
  - Manage subscriptions
  - List payment methods
  - Create payment intents
  - Process refunds

### Dashboard Features

- **Integrations Management**: Browse available integrations, toggle on/off
- **API Keys**: Create, rotate, and revoke API keys
- **Usage Analytics**: Track requests per integration, errors, and latency
- **Activity Logs**: Recent tool calls for debugging
- **AI Builder** (Phase 2 & 3): Generate MCP servers from API documentation
  - **Multiple input format support**:
    - OpenAPI 3.0 specifications
    - Postman Collections (v2.1)
    - cURL commands (single or multiple)
    - Plain text API descriptions
    - API Blueprint format
    - Documentation URLs and GitHub repositories
  - **Production-ready Claude API integration** for code generation
  - Advanced prompt engineering for accurate MCP server generation
  - Self-healing code with automatic error detection and fixing
  - Automatic tool extraction and configuration
  - AI-powered documentation generation
  - **Production-ready Vercel deployment integration**
  - One-click deployment workflow with health checks
  - Automatic project creation and management
  - Real-time deployment status tracking
  - **Comprehensive security scanning**
  - Hardcoded credential detection (API keys, secrets, tokens)
  - Vulnerability detection (SQL injection, XSS, command execution)
  - Sandbox compliance validation
  - Security audit logging
  - **Advanced editor and preview features** (Phase 3.4)
  - Monaco code editor with TypeScript support and syntax highlighting
  - Live code preview and testing with tool execution simulation
  - Comprehensive version control with rollback and diff comparison
  - Server analytics and monitoring with performance metrics
  - Health checks and usage trend tracking
  - **Collaboration features** (Phase 3.6)
  - Team workspaces with role-based access control (owner, admin, editor, viewer)
  - Server sharing with public links, workspace sharing, and user-specific permissions
  - Comment and review system with threading and resolution tracking
  - Access control and hierarchical permissions
  - Code review with line-specific comments

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Convex (real-time database + serverless functions)
- **Auth**: Clerk (OAuth, social login)
- **API Layer**: Elysia (type-safe, fast)
- **MCP Servers**: Vercel Functions (serverless, HTTP transport)
- **Testing**: Vitest with 1642 passing tests
- **Code Editor**: Monaco Editor for in-browser code editing
- **AI Integration**: Claude API (Anthropic SDK) for code generation

## Project Structure

```
mcp-app-store/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── gateway/            # MCP Gateway (Elysia)
│   │   ├── integrations/       # Integration functions
│   │   │   ├── github/         # GitHub integration
│   │   │   ├── linear/         # Linear integration
│   │   │   ├── notion/         # Notion integration
│   │   │   ├── slack/          # Slack integration
│   │   │   ├── postgresql/     # PostgreSQL integration
│   │   │   ├── google-drive/   # Google Drive integration
│   │   │   ├── gmail/          # Gmail integration
│   │   │   ├── jira/           # Jira integration
│   │   │   ├── airtable/       # Airtable integration
│   │   │   └── stripe/         # Stripe integration
│   │   ├── keys/               # API key management
│   │   ├── oauth/              # OAuth flows
│   │   │   ├── github/         # GitHub OAuth
│   │   │   ├── linear/         # Linear OAuth
│   │   │   └── notion/         # Notion OAuth
│   │   └── webhooks/
│   │       └── clerk/          # Clerk webhook (user sync)
│   └── dashboard/
│       ├── integrations/       # Browse & manage integrations
│       ├── api-keys/           # API key management UI
│       ├── usage/              # Usage analytics UI
│       ├── logs/               # Activity logs UI
│       ├── workspaces/         # Team workspaces UI
│       └── builder/            # AI Builder UI (Phase 2)
│           └── [serverId]/     # Server detail with sharing & comments
├── convex/                     # Convex backend
│   ├── schema.ts               # Database schema
│   ├── auth.ts                 # Auth queries/mutations
│   ├── integrations.ts         # Integration CRUD
│   ├── usage.ts                # Usage logging
│   ├── ai.ts                   # AI Builder actions (Phase 2)
│   └── seed.ts                 # Seed data (integrations catalog)
├── components/
│   ├── comments/
│   │   └── comment-thread.tsx  # Comment and review system
│   ├── sharing/
│   │   └── share-dialog.tsx    # Server sharing UI
│   ├── workspaces/
│   │   └── workspace-list.tsx  # Workspace management UI
│   ├── ui/                     # UI component library
│   │   ├── dialog.tsx          # Dialog component
│   │   ├── avatar.tsx          # Avatar component
│   │   └── ...                 # Other UI components
│   └── providers/
│       └── convex-provider.tsx # Convex React provider
├── lib/
│   ├── encryption.ts           # Token encryption & API key utils
│   ├── oauth.ts                # OAuth helpers (token refresh, etc.)
│   ├── claude.ts               # Claude API integration (Phase 2 & 3)
│   ├── vercel.ts               # Vercel API integration (Phase 3.2)
│   ├── security.ts             # Security scanning (Phase 3.3)
│   ├── input-parsers.ts        # Input parsers (Phase 3.5)
│   └── convex.ts               # Convex client singleton
├── packages/
│   └── client/                 # MCP Hub client (@mcphub/client)
│       ├── src/
│       │   ├── index.ts        # Main client implementation
│       │   └── index.test.ts   # Client tests
│       ├── package.json        # NPM package manifest
│       └── README.md           # Client documentation
└── test/                       # Test configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account
- A Clerk account

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd mcp-app-store
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

# For AI Builder (Phase 2 & 3)
ANTHROPIC_API_KEY=<your-claude-api-key>  # Get from https://console.anthropic.com
VERCEL_TOKEN=<your-vercel-token>  # Get from https://vercel.com/account/tokens
```

4. Initialize Convex:
```bash
npx convex dev
```

5. Seed the database with GitHub integration:
```bash
npx convex run seed:seedIntegrations
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

Run tests with UI:
```bash
npm run test:ui
```

### Test Coverage

- **1642 tests passing** across 50 test suites
- Encryption utilities (16 tests)
- API key management (12 tests)
- MCP Gateway (24 tests)
- GitHub integration (15 tests)
- Integrations catalog (18 tests)
- Usage logging and analytics (18 tests)
- Environment validation (11 tests)
- Integration toggle functionality (14 tests)
- Error boundary components (19 tests)
- Loading components (25 tests)
- Rate limiting (20 tests)
- Clerk webhook verification (28 tests)
- Health check endpoint (25 tests)
- Request/response logging middleware (64 tests)
- OpenAPI 3.0 specification (48 tests)
- Input validation library (77 tests)
- OAuth utilities (32 tests)
- OAuth GitHub authorization (7 tests)
- OAuth GitHub callback (8 tests)
- OAuth Linear authorization (7 tests)
- OAuth Linear callback (8 tests)
- OAuth Notion authorization (6 tests)
- OAuth Notion callback (9 tests)
- OAuth token refresh logic (9 tests)
- MCP Hub client (@mcphub/client) (15 tests)
- Usage analytics dashboard (17 tests)
- Activity logs dashboard (23 tests)
- Slack integration (20 tests)
- Integration toggle functionality (40 tests)
- PostgreSQL integration (34 tests)
- Google Drive integration (55 tests)
- Gmail integration (67 tests)
- Jira integration (73 tests)
- Airtable integration (64 tests)
- Stripe integration (73 tests)
- AI Builder UI (36 tests)
- AI Builder actions (95 tests)
- Claude API integration (49 tests, including 7 streaming tests)
- Vercel API integration (73 tests)
- Security scanning (58 tests)
- Input parsers (43 tests)
- Logger utility (39 tests)
- Code editor component (35 tests)
- Code preview component (35 tests)
- Version control utilities (49 tests)
- Analytics utilities (60 tests)
- Workspaces page (3 tests)
- Server detail page with collaboration UI (21 tests)

## API Documentation

The API is fully documented using OpenAPI 3.0 specification. Access the interactive documentation at:

```
GET /api/docs
```

This endpoint returns the complete OpenAPI specification in JSON format, which can be used with tools like:
- Swagger UI
- Postman
- Redoc
- Any OpenAPI-compatible client

### MCP Gateway

#### Health Check
```
GET /api/gateway/health
```

#### List Tools
```
GET /api/gateway/tools/list
Headers:
  x-api-key: <your-api-key>
```

#### Call a Tool
```
POST /api/gateway/tools/call
Headers:
  x-api-key: <your-api-key>
Body:
  {
    "name": "github/create_issue",
    "arguments": {
      "owner": "user",
      "repo": "repo",
      "title": "Issue title",
      "body": "Issue description"
    }
  }
```

### API Keys

#### List API Keys
```
GET /api/keys
```

#### Create API Key
```
POST /api/keys
Body:
  {
    "name": "Production Key"
  }
```

#### Revoke API Key
```
DELETE /api/keys?id=<key-id>
```

## Usage with Claude Desktop

### Installation

The `@mcphub/client` package allows you to connect Claude Desktop to your MCP Hub account.

1. Get your API key from the MCP Hub dashboard
2. Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcphub": {
      "command": "npx",
      "args": ["-y", "@mcphub/client", "--token", "YOUR_API_KEY_HERE"]
    }
  }
}
```

3. Restart Claude Desktop
4. All your enabled integrations will be available as tools in Claude

For more details, see the [client package documentation](./packages/client/README.md).

## Development

### Adding a New Integration

1. Create a new integration function in `app/api/integrations/<integration-name>/route.ts`
2. Implement the MCP tools using Elysia
3. Create tests in `app/api/integrations/<integration-name>/route.test.ts`
4. Add the integration to the Convex database:

```typescript
await convex.mutation(api.integrations.createIntegration, {
  slug: "integration-name",
  name: "Integration Name",
  description: "Description",
  category: "developer",
  status: "active",
  functionPath: "/api/integrations/integration-name",
  tools: [
    {
      name: "tool_name",
      description: "Tool description",
      schema: { /* JSON schema */ },
    },
  ],
  resources: [],
});
```

### Database Schema

The Convex schema includes:

- **users**: User accounts (synced from Clerk)
- **apiKeys**: API keys for MCP authentication
- **integrations**: Catalog of available integrations
- **userIntegrations**: User's enabled integrations and OAuth tokens
- **usageLogs**: Usage tracking for analytics and billing
- **billingMeters**: Aggregated usage by period
- **generatedServers**: AI-generated servers (Phase 2)

## Security

- API keys are hashed using SHA-256 before storage
- OAuth tokens are encrypted at rest using AES-256-CBC
- Clerk handles user authentication with OAuth support
- HTTPS required for all API endpoints in production
- Webhook signature verification for Clerk events

## Performance

- Serverless functions scale to zero when unused
- Real-time subscriptions for live dashboard updates
- Automatic indexing with Convex
- Request latency tracking and monitoring
- Error rate monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Roadmap

### Phase 2: AI Builder ✅ COMPLETE

- **Input Support**: OpenAPI specs, Postman collections, cURL commands, plain text, API Blueprint, documentation URLs, GitHub repos
- **Code Generation**: Auto-generate MCP servers from API documentation using Claude API
- **Deployment**: Production-ready Vercel deployment integration
- **Documentation**: AI-powered documentation generation
- **Security**: Comprehensive security scanning with credential detection, vulnerability detection, and sandbox validation
- **Testing**: Comprehensive test coverage (311 tests across AI Builder, Claude API, Vercel integration, Security scanning, and Input parsers)

### Phase 3.4: Advanced Features ✅ COMPLETE

- **Monaco Editor**: Professional code editor with TypeScript support, syntax highlighting, and validation
- **Live Preview**: Test tools before deployment with simulated execution
- **Version Control**: Complete version history with rollback, diff comparison, and pruning
- **Analytics**: Server monitoring with performance metrics, health checks, and usage trends
- **Testing**: 179 new tests (Code editor: 35, Preview: 35, Version control: 49, Analytics: 60)

### Future Integrations

**Tier 1 - Must Have:**
- Linear - issues, projects, cycles
- Notion - pages, databases, search
- Slack - messages, channels, users
- PostgreSQL - query, schema inspection

**Tier 2 - High Value:**
- Google Drive - files, docs, search
- Gmail - read, send, search
- Jira - issues, projects, boards
- Airtable - bases, tables, records
- Stripe - customers, invoices, subscriptions

## Support

For questions and support, please open an issue on GitHub.
