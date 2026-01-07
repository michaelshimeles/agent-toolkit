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
});
