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
    tokenIssuedAt: v.optional(v.number()), // Timestamp when OAuth token was issued
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

    // External API key requirements (detected during generation)
    requiredApiKeys: v.optional(v.array(v.object({
      serviceName: v.string(),      // "OpenWeatherMap", "Stripe", etc.
      serviceUrl: v.optional(v.string()),  // Where to get the key
      instructions: v.optional(v.string()), // Setup instructions
    }))),

    // Security config
    allowedDomains: v.array(v.string()),
    rateLimit: v.number(),

    // Version history
    version: v.number(),
    previousVersions: v.optional(v.array(v.string())), // Stored code snapshots

    // Collaboration (Phase 3.6)
    workspaceId: v.optional(v.id("workspaces")),
    isPublic: v.optional(v.boolean()), // Public servers can be discovered/shared
  })
    .index("by_user", ["userId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_workspace", ["workspaceId"]),

  // Team workspaces (Phase 3.6)
  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    settings: v.optional(v.object({
      defaultPermissions: v.string(), // "view", "edit", "admin"
      allowPublicServers: v.boolean(),
    })),
  })
    .index("by_owner", ["ownerId"]),

  // Workspace members (Phase 3.6)
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    invitedBy: v.optional(v.id("users")),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  // Server shares (Phase 3.6)
  serverShares: defineTable({
    serverId: v.id("generatedServers"),
    sharedWith: v.union(
      v.literal("public"), // Anyone with link
      v.literal("workspace"), // Workspace members
      v.literal("user") // Specific user
    ),
    userId: v.optional(v.id("users")), // For user-specific shares
    permission: v.union(
      v.literal("view"),
      v.literal("edit"),
      v.literal("admin")
    ),
    sharedBy: v.id("users"),
    expiresAt: v.optional(v.number()),
  })
    .index("by_server", ["serverId"])
    .index("by_user", ["userId"]),

  // Comments and reviews (Phase 3.6)
  comments: defineTable({
    serverId: v.id("generatedServers"),
    userId: v.id("users"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")), // For threaded comments
    codeLineNumber: v.optional(v.number()), // For inline code comments
    resolved: v.optional(v.boolean()),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_server", ["serverId"])
    .index("by_user", ["userId"])
    .index("by_parent", ["parentCommentId"]),

  // External API Keys for generated servers
  externalApiKeys: defineTable({
    userId: v.id("users"),
    serverId: v.id("generatedServers"),
    serviceName: v.string(), // "OpenWeatherMap", "Twitter API", etc.
    serviceKey: v.string(), // Encrypted API key for the external service
    keyName: v.string(), // User-friendly name for the key
    createdAt: v.number(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_server", ["serverId"])
    .index("by_user_and_service", ["userId", "serviceName"]),

  // Agent Skills for Claude Code
  skills: defineTable({
    userId: v.id("users"),
    name: v.string(), // lowercase, hyphens only, max 64 chars
    description: v.string(), // max 1024 chars
    status: v.union(
      v.literal("draft"),
      v.literal("deployed"),
      v.literal("archived")
    ),
    files: v.object({
      skillMd: v.string(), // SKILL.md content
      scripts: v.optional(v.array(v.object({
        name: v.string(),
        content: v.string(),
        language: v.string(), // "python", "bash", "javascript"
      }))),
      references: v.optional(v.array(v.object({
        name: v.string(),
        content: v.string(),
      }))),
      assets: v.optional(v.array(v.object({
        name: v.string(),
        content: v.string(),
        type: v.string(), // MIME type or file extension
      }))),
    }),
    // GitHub deployment info
    githubRepo: v.optional(v.string()), // "owner/repo"
    githubUrl: v.optional(v.string()), // Full URL to the skill
    deployedAt: v.optional(v.number()),
    // Metadata from SKILL.md frontmatter
    metadata: v.object({
      license: v.optional(v.string()),
      version: v.string(),
      author: v.optional(v.string()),
      compatibility: v.optional(v.string()),
      allowedTools: v.optional(v.array(v.string())),
    }),
    // MCP dependencies for skills that need external connectivity
    mcpDependencies: v.optional(v.array(v.object({
      mcpSlug: v.string(),              // e.g., "github", "linear"
      mcpName: v.string(),              // Display name
      description: v.string(),          // Why this MCP is needed
      requiredTools: v.array(v.string()), // Which tools from the MCP are used
      optional: v.boolean(),            // Whether the MCP is optional
    }))),
    // Template reference if created from template
    templateId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Summary for progressive disclosure (~100 tokens metadata)
    summary: v.optional(v.object({
      shortDescription: v.optional(v.string()),  // Brief description for list views
      triggers: v.optional(v.array(v.string())), // When to invoke this skill
      scope: v.optional(v.string()),             // What this skill covers
      estimatedTokens: v.optional(v.number()),   // Estimated token count for full skill
    })),
    // Categorization
    tags: v.optional(v.array(v.string())), // User-defined tags for organization
    category: v.optional(v.string()),      // Primary category (e.g., "workflow", "template", "integration")
    // Workflow definition for multi-step skills
    workflow: v.optional(v.object({
      steps: v.optional(v.array(v.object({
        order: v.optional(v.number()),           // Step order (1, 2, 3...)
        title: v.string(),                       // Step title
        description: v.optional(v.string()),     // What this step does
        mcpTools: v.optional(v.array(v.string())), // MCP tools used in this step
      }))),
    })),
    // Example inputs/outputs for testing and documentation
    examples: v.optional(v.array(v.object({
      title: v.string(),                   // Example name
      input: v.string(),                   // Sample input/prompt
      output: v.string(),                  // Expected output
    }))),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_name", ["userId", "name"]),

  // User settings (including Anthropic API key)
  userSettings: defineTable({
    userId: v.id("users"),
    anthropicApiKey: v.optional(v.string()), // Encrypted API key
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Skill version history
  skillVersions: defineTable({
    skillId: v.id("skills"),
    version: v.number(),
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
    changeDescription: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_skill", ["skillId"])
    .index("by_skill_version", ["skillId", "version"]),

  // Skill A/B testing experiments
  skillExperiments: defineTable({
    skillId: v.id("skills"),
    name: v.string(),                     // Experiment name
    status: v.union(
      v.literal("draft"),
      v.literal("running"),
      v.literal("completed")
    ),
    controlVersionId: v.id("skillVersions"),    // Original version
    treatmentVersionId: v.id("skillVersions"),  // Variant to test
    trafficSplit: v.number(),             // 0-100, percentage going to treatment
    startedAt: v.optional(v.number()),    // When experiment started
    endedAt: v.optional(v.number()),      // When experiment ended
    createdAt: v.number(),
  })
    .index("by_skill", ["skillId"])
    .index("by_status", ["status"]),

  // Experiment results tracking
  experimentResults: defineTable({
    experimentId: v.id("skillExperiments"),
    versionId: v.id("skillVersions"),
    variant: v.union(
      v.literal("control"),
      v.literal("treatment")
    ),
    totalInvocations: v.number(),
    successCount: v.number(),
    errorCount: v.number(),
    avgLatencyMs: v.number(),
    avgTokens: v.number(),
    userSatisfactionScore: v.optional(v.number()), // Optional user feedback score
    updatedAt: v.number(),
  })
    .index("by_experiment", ["experimentId"]),

  // Anonymous tool call analytics (no user IDs stored)
  anonymousToolCalls: defineTable({
    // Core fields
    sessionHash: v.string(), // SHA-256 hash of session ID (not user ID)
    serverId: v.optional(v.id("generatedServers")),
    integrationSlug: v.optional(v.string()),
    toolName: v.string(),
    timestamp: v.number(),
    dayOfWeek: v.number(), // 0-6 for weekly patterns

    // Model & Client identification
    modelId: v.optional(v.string()), // "claude-3-opus", "gpt-4-turbo", etc.
    clientId: v.optional(v.string()), // "cursor", "claude-desktop", etc.
    clientVersion: v.optional(v.string()),

    // Execution metrics
    latencyMs: v.number(),
    status: v.union(
      v.literal("success"),
      v.literal("error"),
      v.literal("rate_limited")
    ),
    errorCategory: v.optional(v.string()), // "validation", "timeout", "auth", "upstream", "rate_limit"
    inputTokenEstimate: v.optional(v.number()),
    outputTokenEstimate: v.optional(v.number()),

    // Retry & Agent loop tracking
    isRetry: v.boolean(),
    retryCount: v.number(),
    sessionCallIndex: v.number(), // Position in session's call sequence
    agentLoopDepth: v.optional(v.number()),

    // Execution mode
    executionMode: v.union(v.literal("sequential"), v.literal("parallel")),
    batchId: v.optional(v.string()), // Groups parallel calls
    batchSize: v.optional(v.number()),

    // Parameter complexity (anonymized)
    parameterSchema: v.optional(v.any()), // Types only, no values
    paramDepth: v.optional(v.number()),
    paramCount: v.optional(v.number()),
    arrayMaxLength: v.optional(v.number()),

    // Geographic & Rate limiting
    geoRegion: v.optional(v.string()), // Country code only
    hitRateLimit: v.boolean(),
    rateLimitType: v.optional(v.string()),
  })
    .index("by_session", ["sessionHash"])
    .index("by_timestamp", ["timestamp"])
    .index("by_tool", ["toolName"])
    .index("by_integration", ["integrationSlug"])
    .index("by_model", ["modelId"])
    .index("by_client", ["clientId"])
    .index("by_region", ["geoRegion"]),

  // Pre-computed daily analytics aggregates
  analyticsAggregates: defineTable({
    // Core metrics
    date: v.string(), // "YYYY-MM-DD"
    integrationSlug: v.optional(v.string()),
    toolName: v.string(),
    callCount: v.number(),
    successCount: v.number(),
    errorCount: v.number(),
    rateLimitedCount: v.number(),

    // Latency
    avgLatencyMs: v.number(),
    p50LatencyMs: v.optional(v.number()),
    p95LatencyMs: v.optional(v.number()),
    p99LatencyMs: v.optional(v.number()),

    // Token usage
    avgInputTokens: v.optional(v.number()),
    avgOutputTokens: v.optional(v.number()),
    totalInputTokens: v.optional(v.number()),
    totalOutputTokens: v.optional(v.number()),

    // Time distribution (24 hourly buckets)
    hourlyDistribution: v.array(v.number()),

    // Model & Client breakdown
    byModel: v.optional(v.any()), // { modelId: count }
    byClient: v.optional(v.any()), // { clientId: count }

    // Retry statistics
    retryRate: v.optional(v.number()),
    avgRetryCount: v.optional(v.number()),
    avgLoopDepth: v.optional(v.number()),

    // Execution mode
    parallelCallRate: v.optional(v.number()),
    avgBatchSize: v.optional(v.number()),

    // Complexity metrics
    avgParamDepth: v.optional(v.number()),
    avgParamCount: v.optional(v.number()),

    // Geographic distribution
    byRegion: v.optional(v.any()), // { regionCode: count }

    // Rate limiting
    rateLimitHitRate: v.optional(v.number()),
    byRateLimitType: v.optional(v.any()), // { limitType: count }
  })
    .index("by_date", ["date"])
    .index("by_date_tool", ["date", "toolName"])
    .index("by_tool", ["toolName"]),

  // Common tool usage sequences/workflows
  toolSequences: defineTable({
    sequenceHash: v.string(), // Hash of the tool sequence
    tools: v.array(v.string()), // Tool names in order
    occurrences: v.number(),
    avgSessionDuration: v.optional(v.number()), // Average time to complete
    successRate: v.optional(v.number()),
    lastSeen: v.number(), // Timestamp
  })
    .index("by_hash", ["sequenceHash"])
    .index("by_occurrences", ["occurrences"])
    .index("by_last_seen", ["lastSeen"]),
});
