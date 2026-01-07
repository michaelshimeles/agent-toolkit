# MCP Hub: Plaid for AI Agents

> The unified integration layer for AI agents. Connect once, access everything.

---

## Vision

Build the infrastructure that connects AI agents to the world. Just as Plaid abstracted away the complexity of connecting to thousands of banks, MCP Hub abstracts away the complexity of connecting AI agents to thousands of services.

**North Star Metric:** Number of MCP tool calls processed per month

---

## Product Overview

### What We're Building

A platform that allows AI agents (Claude, GPT, etc.) to connect to 100+ services through a single, unified MCP endpoint. Users configure one connection and get access to Linear, Notion, GitHub, Slack, and any other integrated service.

### Value Proposition

| For Users | For AI App Developers | For Enterprises |
|-----------|----------------------|-----------------|
| One connection, all tools | Embed integrations instantly | Audit logs, compliance, control |
| Unified auth (no managing 20 API keys) | Pre-built, tested integrations | SSO, private deployments |
| Works with any MCP client | Usage analytics | Custom integration requests |

---

## Phase 1: Foundation

### 1.1 Core Infrastructure

**MCP Gateway**
- Single endpoint that routes to underlying integration servers
- Protocol: HTTP transport (SSE for streaming)
- Request routing based on tool/resource namespace
- Authentication layer (API keys, later OAuth)

**Integration Runtime**
- MCP servers as Vercel Functions (HTTP transport)
- One function per integration (e.g., `/api/integrations/github`)
- Auto-scaling to zero when unused
- Built-in monitoring via Vercel dashboard

**Registry Database**
- Integrations catalog (name, description, tools, resources, prompts)
- User accounts and API keys
- Connection configurations (which integrations enabled per user)
- Usage tracking and billing meters

### 1.2 Initial Integrations (Pick 10)

Priority based on: developer demand + API quality + official MCP server availability

**Tier 1 - Must Have:**
1. GitHub - repos, issues, PRs, code search
2. Linear - issues, projects, cycles
3. Notion - pages, databases, search
4. Slack - messages, channels, users
5. PostgreSQL - query, schema inspection

**Tier 2 - High Value:**
6. Google Drive - files, docs, search
7. Gmail - read, send, search
8. Jira - issues, projects, boards
9. Airtable - bases, tables, records
10. Stripe - customers, invoices, subscriptions

### 1.3 User Experience

**Connection Flow:**
1. User signs up → gets API key
2. Configures Claude Desktop with single MCP Hub connection
3. Opens dashboard → toggles which integrations to enable
4. For each integration, completes OAuth flow (or provides API key)
5. All enabled tools now available in Claude

**Claude Desktop Config (what users paste):**
```json
{
  "mcpServers": {
    "mcphub": {
      "command": "npx",
      "args": ["-y", "@mcphub/client", "--token", "mcp_sk_xxx"]
    }
  }
}
```

### 1.4 Dashboard Features

- **Integrations:** Browse available, toggle on/off, manage OAuth connections
- **API Keys:** Create, rotate, revoke
- **Usage:** Requests per integration, errors, latency
- **Logs:** Recent tool calls (for debugging)

---

## Phase 2: AI Builder

### 2.1 Vision

**Input:** User provides API documentation, OpenAPI spec, or a GitHub repo
**Output:** A fully deployed, documented MCP server ready to connect to Claude

This is the "Vercel for MCP" experience — drop in your docs, get a working integration.

### 2.2 Supported Input Types

| Input Type | How AI Processes It |
|------------|---------------------|
| **OpenAPI/Swagger spec** | Parse endpoints → generate tools with exact schemas |
| **API documentation URL** | Scrape + analyze → infer endpoints and parameters |
| **GitHub repo** | Clone → analyze code → extract API surface |
| **Postman collection** | Import → convert requests to MCP tools |
| **Plain text description** | Parse intent → generate best-guess implementation |

### 2.3 The Builder Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Builder Pipeline                          │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
  │    INPUT     │     │   ANALYZE    │     │      GENERATE        │
  │              │     │              │     │                      │
  │ • OpenAPI    │────▶│ • Parse spec │────▶│ • xmcp tools         │
  │ • Docs URL   │     │ • Infer types│     │ • Zod schemas        │
  │ • GitHub repo│     │ • Map routes │     │ • Auth handling      │
  │ • Postman    │     │ • Extract auth│    │ • Error handling     │
  └──────────────┘     └──────────────┘     └──────────────────────┘
                                                       │
                                                       ▼
  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
  │   CONNECT    │     │   DOCUMENT   │     │       DEPLOY         │
  │              │◀────│              │◀────│                      │
  │ • Claude URL │     │ • Auto README│     │ • Build on Vercel    │
  │ • API key    │     │ • Tool docs  │     │ • Run tests          │
  │ • One-click  │     │ • Examples   │     │ • Health check       │
  └──────────────┘     └──────────────┘     └──────────────────────┘
```

### 2.4 User Experience

**Step 1: Provide Source**
```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 Create MCP Server from API                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Choose input type:                                             │
│                                                                 │
│  ○ OpenAPI Spec    ○ Documentation URL    ○ GitHub Repo        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://api.acme.com/docs/openapi.json                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Analyze API →]                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Step 2: Review & Configure**
```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Detected API Structure                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Found 12 endpoints. Select which to include as MCP tools:      │
│                                                                 │
│  ☑ GET  /customers         → list_customers                    │
│  ☑ POST /customers         → create_customer                   │
│  ☑ GET  /customers/{id}    → get_customer                      │
│  ☐ DELETE /customers/{id}  → delete_customer (destructive)     │
│  ☑ GET  /orders            → list_orders                       │
│  ☑ POST /orders            → create_order                      │
│  ...                                                            │
│                                                                 │
│  Authentication: [API Key ▾]  Header: [X-API-Key]               │
│                                                                 │
│  [Edit Generated Code]  [Deploy →]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Step 3: Deploy & Document**
```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ MCP Server Deployed!                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Server: acme-api.mcphub.dev                                    │
│  Status: ● Running                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Tools:                                                   │   │
│  │ • list_customers - Retrieve all customers                │   │
│  │ • create_customer - Create a new customer record         │   │
│  │ • get_customer - Get customer by ID                      │   │
│  │ • list_orders - Retrieve all orders                      │   │
│  │ • create_order - Create a new order                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📄 Auto-generated documentation: [View Docs]                   │
│                                                                 │
│  Connect to Claude:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ { "mcpServers": { "acme": { ... } } }          [Copy]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Technical Implementation

**AI Pipeline (Convex Actions):**

```typescript
// convex/ai/generateMCP.ts
export const generateFromOpenAPI = action({
  args: { specUrl: v.string(), userId: v.id("users") },
  handler: async (ctx, { specUrl, userId }) => {
    // 1. Fetch and parse OpenAPI spec
    const spec = await fetchOpenAPISpec(specUrl);
    
    // 2. Extract endpoints and schemas
    const endpoints = parseEndpoints(spec);
    const schemas = extractSchemas(spec);
    
    // 3. Generate xmcp code using Claude
    const generatedCode = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      system: XMCP_GENERATOR_PROMPT,
      messages: [{
        role: "user",
        content: `Generate an xmcp MCP server for this API:\n${JSON.stringify({ endpoints, schemas })}`
      }]
    });
    
    // 4. Validate generated code
    const validation = await validateXMCPCode(generatedCode);
    if (!validation.valid) {
      // Self-heal: ask Claude to fix issues
      return await selfHealCode(generatedCode, validation.errors);
    }
    
    // 5. Store draft in Convex
    const serverId = await ctx.runMutation(api.servers.createDraft, {
      userId,
      code: generatedCode,
      spec: spec,
    });
    
    return { serverId, preview: generatedCode };
  }
});

export const deployServer = action({
  args: { serverId: v.id("generatedServers") },
  handler: async (ctx, { serverId }) => {
    const server = await ctx.runQuery(api.servers.get, { serverId });
    
    // 1. Create Vercel deployment via API
    const deployment = await vercel.deployments.create({
      name: server.slug,
      files: buildVercelFiles(server.code),
      projectSettings: {
        framework: null,
        buildCommand: "npm run build",
      }
    });
    
    // 2. Wait for deployment to be ready
    await waitForDeployment(deployment.id);
    
    // 3. Run health check
    const health = await checkMCPHealth(deployment.url);
    
    // 4. Update status in Convex
    await ctx.runMutation(api.servers.markDeployed, {
      serverId,
      deploymentUrl: deployment.url,
      status: health.ok ? "deployed" : "failed",
    });
    
    // 5. Generate documentation
    await ctx.runAction(api.ai.generateDocs, { serverId });
    
    return { url: deployment.url, status: health };
  }
});
```

**Auto-Documentation Generation:**

```typescript
// convex/ai/generateDocs.ts
export const generateDocs = action({
  args: { serverId: v.id("generatedServers") },
  handler: async (ctx, { serverId }) => {
    const server = await ctx.runQuery(api.servers.get, { serverId });
    
    const docs = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      system: DOCS_GENERATOR_PROMPT,
      messages: [{
        role: "user", 
        content: `Generate documentation for this MCP server:\n${server.code}`
      }]
    });
    
    // Store docs in Convex
    await ctx.runMutation(api.servers.updateDocs, {
      serverId,
      readme: docs.readme,
      toolDocs: docs.tools,
      examples: docs.examples,
    });
  }
});
```

### 2.6 GitHub Repo Analysis

For repos without OpenAPI specs, use code analysis:

```typescript
// convex/ai/analyzeRepo.ts
export const analyzeGitHubRepo = action({
  args: { repoUrl: v.string() },
  handler: async (ctx, { repoUrl }) => {
    // 1. Clone repo (shallow)
    const files = await cloneRepo(repoUrl, { depth: 1 });
    
    // 2. Identify API files (routes, controllers, handlers)
    const apiFiles = identifyAPIFiles(files);
    
    // 3. Extract API surface using Claude
    const analysis = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      system: REPO_ANALYZER_PROMPT,
      messages: [{
        role: "user",
        content: `Analyze this codebase and extract the API surface:\n${apiFiles.map(f => f.content).join('\n---\n')}`
      }]
    });
    
    // 4. Return structured API definition
    return {
      endpoints: analysis.endpoints,
      auth: analysis.authMethod,
      baseUrl: analysis.baseUrl,
    };
  }
});
```

### 2.7 Sandbox & Security

**Isolation:**
- Each generated server runs in its own Vercel Function
- Network egress limited to user-specified domains via Edge Config
- Secrets stored in Vercel environment variables (never in code)

**Code Review:**
- Automated security scan before deployment (semgrep, custom rules)
- Check for credential leaks, SQL injection patterns, etc.
- Flag destructive operations (DELETE, mutations) for user confirmation

**Permissions Model:**
```typescript
// Each generated server has a capability config
const capabilities = {
  allowedDomains: ["api.acme.com"], // Only these domains can be called
  allowedMethods: ["GET", "POST"],   // No DELETE by default
  rateLimit: 100,                    // Requests per minute
  timeout: 30000,                    // 30s max execution
};
```

### 2.8 Iteration & Refinement

Users can refine their generated MCP server:

- **Edit in browser:** Monaco editor with xmcp syntax highlighting
- **Regenerate with feedback:** "Add pagination to list_customers"
- **Version history:** Roll back to previous versions
- **Test in playground:** Try tools before deploying

```
┌─────────────────────────────────────────────────────────────────┐
│  🔧 Edit: acme-api                                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ // src/tools/list-customers.ts                          │   │
│  │ export const schema = {                                  │   │
│  │   page: z.number().optional().default(1),               │   │
│  │   limit: z.number().optional().default(20),             │   │
│  │ };                                                       │   │
│  │                                                          │   │
│  │ export default async function listCustomers({ ... })    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💬 Ask AI to modify:                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Add filtering by customer status                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Apply Changes]  [Test in Playground]  [Deploy →]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### System Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                    MCP Hub Platform (Vercel)                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐  │
│  │   Web App   │     │     API     │     │    MCP Gateway      │  │
│  │  (Next.js)  │────▶│  (Elysia)   │────▶│  (Vercel Function)  │  │
│  └─────────────┘     └─────────────┘     └──────────┬──────────┘  │
│                                                      │             │
│  ┌─────────────┐     ┌─────────────┐                │             │
│  │  Dashboard  │     │   Clerk     │                │             │
│  │   UI/UX     │     │   (Auth)    │                │             │
│  └─────────────┘     └─────────────┘                │             │
│                                                      │             │
├──────────────────────────────────────────────────────┼─────────────┤
│              Integration Runtime (Vercel Functions)  │             │
│                                                      ▼             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  GitHub  │  │  Linear  │  │  Notion  │  │  Slack   │  ...     │
│  │  Server  │  │  Server  │  │  Server  │  │  Server  │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                         Data Layer                                 │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                         Convex                              │   │
│  │  (Database + Real-time + Actions + Scheduled Jobs)          │   │
│  ├────────────────────────────────────────────────────────────┤   │
│  │  Components:                                                │   │
│  │  • @convex-dev/r2 (Cloudflare R2 for file storage)         │   │
│  │  • @convex-dev/stripe (Payments & subscriptions)            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Web App | Next.js 15, React 19 | Full-stack, great DX, SSR/RSC |
| API Layer | Elysia | Type-safe, fast, Eden client for E2E types |
| Styling | Tailwind CSS, shadcn/ui | Fast iteration |
| Backend | Convex | Real-time DB, serverless functions, no infra |
| Auth | Clerk | OAuth, social login, Convex integration |
| Payments | @convex-dev/stripe | Convex component, webhooks handled automatically |
| File Storage | @convex-dev/r2 | Cloudflare R2 via Convex component |
| Hosting (All) | Vercel | App + MCP servers as functions |
| MCP Servers | Vercel Functions | Serverless, auto-scaling, HTTP transport |
| CI/CD | Vercel (GitHub integration) | Auto deploys on push |
| Monitoring | Sentry, Convex Dashboard | Errors, real-time logs |

**Why This Stack:**

- **Convex** eliminates the need for separate database, cache, and real-time infrastructure. It handles:
  - Document database with automatic indexing
  - Real-time subscriptions (dashboard updates live)
  - Serverless functions (mutations, queries, actions)
  - Scheduled jobs (for usage aggregation, billing)
  - Built-in Clerk integration
  - **Components ecosystem** for common needs (Stripe, R2, etc.)

- **@convex-dev/stripe** handles:
  - Webhook processing automatically
  - Subscription state synced to Convex tables
  - Payment intents and checkout sessions
  - No separate webhook endpoint to maintain

- **@convex-dev/r2** provides:
  - Cloudflare R2 storage (S3-compatible, no egress fees)
  - Signed URLs for uploads/downloads
  - Integrated with Convex for metadata

- **Elysia** provides end-to-end type safety with its Eden client, and runs beautifully on Vercel Functions. Perfect for the MCP Gateway API.

- **Vercel Functions** can host MCP servers using HTTP transport. Each integration becomes a serverless function that scales to zero when unused.

### Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (synced from Clerk via webhook)
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // API Keys for MCP authentication
  apiKeys: defineTable({
    userId: v.id("users"),
    keyHash: v.string(), // SHA-256 hash of the key
    name: v.string(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_key_hash", ["keyHash"]),

  // Integrations catalog
  integrations: defineTable({
    slug: v.string(), // "github", "linear", etc.
    name: v.string(),
    description: v.string(),
    iconUrl: v.optional(v.string()),
    category: v.string(), // "developer", "productivity", "data"
    status: v.union(v.literal("active"), v.literal("beta"), v.literal("deprecated")),
    functionPath: v.string(), // Vercel function path
    tools: v.array(v.object({
      name: v.string(),
      description: v.string(),
      schema: v.any(), // JSON schema for parameters
    })),
    resources: v.array(v.object({
      uriTemplate: v.string(),
      description: v.string(),
    })),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  // User's enabled integrations
  userIntegrations: defineTable({
    userId: v.id("users"),
    integrationId: v.id("integrations"),
    enabled: v.boolean(),
    oauthTokenEncrypted: v.optional(v.string()),
    config: v.optional(v.any()), // Integration-specific config
  })
    .index("by_user", ["userId"])
    .index("by_user_and_integration", ["userId", "integrationId"]),

  // Usage logs (for analytics and billing)
  usageLogs: defineTable({
    userId: v.id("users"),
    integrationId: v.id("integrations"),
    toolName: v.string(),
    latencyMs: v.number(),
    status: v.union(v.literal("success"), v.literal("error")),
  })
    .index("by_user", ["userId"])
    .index("by_integration", ["integrationId"]),

  // Aggregated billing meters (updated by scheduled job)
  billingMeters: defineTable({
    userId: v.id("users"),
    period: v.string(), // "2024-01", "2024-02", etc.
    requestCount: v.number(),
  })
    .index("by_user_period", ["userId", "period"]),

  // AI-generated servers (Phase 2)
  generatedServers: defineTable({
    userId: v.id("users"),
    slug: v.string(), // URL-safe identifier
    name: v.string(),
    description: v.string(),
    
    // Input source
    sourceType: v.union(
      v.literal("openapi"),
      v.literal("docs_url"),
      v.literal("github_repo"),
      v.literal("postman"),
      v.literal("text")
    ),
    sourceUrl: v.optional(v.string()),
    sourceContent: v.optional(v.string()), // For text input
    
    // Generated output
    code: v.string(), // Full xmcp project as JSON (file tree)
    tools: v.array(v.object({
      name: v.string(),
      description: v.string(),
      schema: v.any(),
    })),
    
    // Deployment
    status: v.union(
      v.literal("analyzing"),
      v.literal("generating"),
      v.literal("draft"),
      v.literal("deploying"),
      v.literal("deployed"),
      v.literal("failed")
    ),
    deploymentUrl: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    
    // Documentation (auto-generated)
    readme: v.optional(v.string()),
    toolDocs: v.optional(v.array(v.object({
      name: v.string(),
      description: v.string(),
      params: v.string(),
      example: v.string(),
    }))),
    
    // Security config
    allowedDomains: v.array(v.string()),
    rateLimit: v.number(),
    
    // Version history
    version: v.number(),
    previousVersions: v.optional(v.array(v.string())), // Stored code snapshots
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),
});
```

**Convex Benefits:**
- Real-time subscriptions: Dashboard auto-updates when usage changes
- Automatic indexing: Define indexes, Convex handles the rest
- Type-safe queries: Full TypeScript from DB to frontend
- Scheduled functions: Perfect for billing aggregation
- Actions: Call external APIs (OAuth token exchange, MCP forwarding)

### MCP Gateway Design

The gateway is an Elysia API that routes requests to integration functions:

```typescript
// api/gateway/route.ts (Next.js Route Handler with Elysia)
import { Elysia } from "elysia";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const app = new Elysia()
  .post("/tools/call", async ({ body, headers }) => {
    const apiKey = headers["x-api-key"];
    
    // 1. Validate API key and get user (Convex query)
    const user = await convex.query(api.auth.getUserByApiKey, { 
      keyHash: hashApiKey(apiKey) 
    });
    if (!user) throw new Error("Invalid API key");

    // 2. Parse the tool name to determine integration
    const { toolName } = body;
    const [integrationSlug, actualToolName] = parseNamespace(toolName);
    // e.g., "github/create_issue" → ["github", "create_issue"]

    // 3. Check if user has this integration enabled (Convex query)
    const connection = await convex.query(api.integrations.getUserConnection, {
      userId: user._id,
      integrationSlug,
    });
    if (!connection?.enabled) {
      throw new Error(`Integration ${integrationSlug} not enabled`);
    }

    // 4. Get integration details
    const integration = await convex.query(api.integrations.getBySlug, { 
      slug: integrationSlug 
    });

    // 5. Forward to the Vercel Function for this integration
    const functionUrl = `${process.env.VERCEL_URL}${integration.functionPath}`;
    const startTime = Date.now();
    
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OAuth-Token": decrypt(connection.oauthTokenEncrypted),
      },
      body: JSON.stringify({
        ...body,
        toolName: actualToolName, // Strip namespace
      }),
    });

    const latency = Date.now() - startTime;

    // 6. Log usage (Convex mutation)
    await convex.mutation(api.usage.log, {
      userId: user._id,
      integrationId: integration._id,
      toolName: actualToolName,
      latencyMs: latency,
      status: response.ok ? "success" : "error",
    });

    return response.json();
  });

export const POST = app.handle;
```

### Integration Function Example

Each integration is a Vercel Function that implements MCP tools:

```typescript
// api/integrations/github/route.ts
import { Elysia } from "elysia";
import { Octokit } from "@octokit/rest";

const app = new Elysia()
  .post("/", async ({ body, headers }) => {
    const token = headers["x-oauth-token"];
    const octokit = new Octokit({ auth: token });

    const { toolName, arguments: args } = body;

    switch (toolName) {
      case "create_issue":
        const issue = await octokit.issues.create({
          owner: args.owner,
          repo: args.repo,
          title: args.title,
          body: args.body,
        });
        return { content: [{ type: "text", text: JSON.stringify(issue.data) }] };

      case "list_repos":
        const repos = await octokit.repos.listForAuthenticatedUser();
        return { content: [{ type: "text", text: JSON.stringify(repos.data) }] };

      // ... more tools
    }
  });

export const POST = app.handle;
```

---

## Go-To-Market Strategy

### Launch Sequence

**Private Alpha:**
- Hand-pick 20-50 developers
- Focus on feedback and iteration
- Fix critical bugs

**Public Beta:**
- ProductHunt launch
- Twitter/X developer community
- Dev.to / Hashnode articles
- Free tier available

**General Availability:**
- Paid tiers enabled
- Enterprise sales motion
- Partner integrations

### Marketing Channels

1. **Content Marketing**
   - "How to connect Claude to [Service]" tutorials
   - MCP ecosystem thought leadership
   - Comparison guides (vs. manual setup)

2. **Developer Community**
   - Discord server
   - GitHub discussions
   - Twitter/X presence

3. **Partnerships**
   - Anthropic (featured in Claude docs?)
   - Integration partners (co-marketing)
   - AI app builders (embed our SDK)

4. **SEO**
   - Target "MCP server for [Service]" keywords
   - Integration-specific landing pages

---

## Success Metrics

### Phase 1: Foundation

| Metric | Target |
|--------|--------|
| Integrations live | 10+ |
| Registered users | 1,000 |
| Monthly active users | 200 |
| Tool calls / month | 100,000 |
| Uptime | 99.5% |
| Paying customers | 50 |
| MRR | $2,500 |

### Phase 2: AI Builder

| Metric | Target |
|--------|--------|
| AI-generated servers | 500+ |
| Total integrations | 50+ |
| Enterprise customers | 10 |
| MRR | $25,000 |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Providers blocking access | Build relationships, add value (analytics, support) |
| Claude deprecates MCP | Protocol is open, other clients will adopt |
| Security breach | SOC2, security audits, bug bounty |
| AI-generated code vulnerabilities | Sandboxing, automated scanning, review process |
| Vercel function timeouts | Use streaming, optimize cold starts, edge functions |
| Convex limits for high volume | Monitor usage, implement request batching |
| OAuth token storage | Encrypt at rest, use Convex's built-in encryption |

---

## Open Questions

- [ ] Brand name? (MCP Hub, AgentPlug, ConnectAI, etc.)
- [ ] Pricing model for AI builder? (per generation? per deploy?)
- [ ] Self-hosted / on-prem option for enterprise?
- [ ] Which integrations to prioritize first?
- [ ] Partner with xmcp team or build independently?

---

## Project Structure

```
mcphub/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/            # Protected dashboard routes
│   │   ├── integrations/       # Browse & manage integrations
│   │   ├── api-keys/           # API key management
│   │   ├── usage/              # Usage analytics
│   │   ├── billing/            # Subscription management
│   │   └── settings/           # Account settings
│   ├── api/
│   │   ├── gateway/            # MCP Gateway (Elysia)
│   │   ├── integrations/       # Integration functions
│   │   │   ├── github/
│   │   │   ├── linear/
│   │   │   ├── notion/
│   │   │   └── ...
│   │   └── webhooks/
│   │       └── clerk/          # Clerk webhook (user sync)
│   └── layout.tsx
├── convex/                     # Convex backend
│   ├── schema.ts               # Database schema
│   ├── auth.ts                 # Auth queries/mutations
│   ├── integrations.ts         # Integration CRUD
│   ├── usage.ts                # Usage logging
│   ├── billing.ts              # Stripe component usage
│   ├── storage.ts              # R2 component usage
│   ├── _generated/             # Auto-generated types
│   └── components/             # Convex component configs
│       ├── stripe.ts           # @convex-dev/stripe setup
│       └── r2.ts               # @convex-dev/r2 setup
├── components/                 # React components
├── lib/                        # Shared utilities
│   ├── mcp/                    # MCP protocol helpers
│   └── encryption.ts           # Token encryption
├── public/
├── package.json
├── convex.json
└── next.config.js
```

**Note:** Stripe webhooks are handled automatically by `@convex-dev/stripe` — no separate endpoint needed.

---

## Next Steps

1. **Initialize project**
   ```bash
   npx create-next-app@latest mcphub --typescript --tailwind --app
   cd mcphub
   npm install convex @clerk/nextjs elysia @elysiajs/eden
   npx convex dev --once  # Initialize Convex
   ```

2. **Install Convex components**
   ```bash
   npm install @convex-dev/stripe @convex-dev/r2
   ```
   - Configure Stripe component with API keys
   - Configure R2 component with Cloudflare credentials

3. **Set up Clerk + Convex integration**
   - Configure Clerk provider
   - Add Convex webhook for user sync

4. **Create Convex schema**
   - Copy schema from this doc
   - Run `npx convex dev` to deploy

5. **Build the MCP Gateway**
   - Elysia route at `/api/gateway`
   - API key validation
   - Request routing logic

6. **Implement first integration (GitHub)**
   - OAuth flow with Clerk
   - GitHub function at `/api/integrations/github`
   - Test with Claude Desktop

7. **Create dashboard UI**
   - Integration browser
   - API key management
   - Real-time usage (Convex subscriptions)

8. **Dogfood** - Use it ourselves daily, iterate

---

*Document version: 1.1*
*Last updated: December 2024*
*Stack: Next.js + Elysia, Clerk, Convex, Vercel*

