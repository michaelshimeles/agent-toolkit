import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * List all generated servers for a user
 */
export const listUserServers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generatedServers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get a specific generated server by ID
 */
export const getServer = query({
  args: { serverId: v.id("generatedServers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.serverId);
  },
});

/**
 * Get a generated server by slug
 */
export const getServerBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generatedServers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Create a new generated server draft
 */
export const createDraft = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    slug: v.string(),
    sourceType: v.union(
      v.literal("openapi"),
      v.literal("docs_url"),
      v.literal("github_repo"),
      v.literal("postman"),
      v.literal("text")
    ),
    sourceUrl: v.optional(v.string()),
    sourceContent: v.optional(v.string()),
    code: v.string(),
    tools: v.array(v.object({
      name: v.string(),
      description: v.string(),
      schema: v.any(),
    })),
    allowedDomains: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const serverId = await ctx.db.insert("generatedServers", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      slug: args.slug,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl,
      sourceContent: args.sourceContent,
      code: args.code,
      tools: args.tools,
      status: "draft",
      allowedDomains: args.allowedDomains,
      rateLimit: 100, // Default rate limit
      version: 1,
    });

    return serverId;
  },
});

/**
 * Update server status
 */
export const updateStatus = mutation({
  args: {
    serverId: v.id("generatedServers"),
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
  },
  handler: async (ctx, args) => {
    const { serverId, ...updates } = args;
    await ctx.db.patch(serverId, updates);
  },
});

/**
 * Update server documentation
 */
export const updateDocs = mutation({
  args: {
    serverId: v.id("generatedServers"),
    readme: v.optional(v.string()),
    toolDocs: v.optional(v.array(v.object({
      name: v.string(),
      description: v.string(),
      params: v.string(),
      example: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const { serverId, ...updates } = args;
    await ctx.db.patch(serverId, updates);
  },
});

/**
 * Delete a generated server
 */
export const deleteServer = mutation({
  args: { serverId: v.id("generatedServers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.serverId);
  },
});

/**
 * Store external API key for a server
 */
export const storeExternalApiKey = mutation({
  args: {
    userId: v.id("users"),
    serverId: v.id("generatedServers"),
    serviceName: v.string(),
    serviceKey: v.string(),
    keyName: v.string(),
  },
  handler: async (ctx, args) => {
    const existingKey = await ctx.db
      .query("externalApiKeys")
      .withIndex("by_user_and_service", (q) =>
        q.eq("userId", args.userId).eq("serviceName", args.serviceName)
      )
      .first();

    if (existingKey) {
      // Update existing key
      await ctx.db.patch(existingKey._id, {
        serviceKey: args.serviceKey,
        keyName: args.keyName,
        lastUsed: Date.now(),
      });
      return existingKey._id;
    } else {
      // Create new key
      const keyId = await ctx.db.insert("externalApiKeys", {
        userId: args.userId,
        serverId: args.serverId,
        serviceName: args.serviceName,
        serviceKey: args.serviceKey,
        keyName: args.keyName,
        createdAt: Date.now(),
      });
      return keyId;
    }
  },
});

/**
 * Get external API key for a user and service
 */
export const getExternalApiKey = query({
  args: {
    userId: v.id("users"),
    serviceName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("externalApiKeys")
      .withIndex("by_user_and_service", (q) =>
        q.eq("userId", args.userId).eq("serviceName", args.serviceName)
      )
      .first();
  },
});

/**
 * Get all external API keys for a user
 */
export const listExternalApiKeys = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("externalApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Delete external API key
 */
export const deleteExternalApiKey = mutation({
  args: { keyId: v.id("externalApiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.keyId);
  },
});
