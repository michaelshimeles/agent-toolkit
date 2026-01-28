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
 * Internal mutation to store encrypted API key
 */
export const _storeEncryptedApiKey = mutation({
  args: {
    userId: v.id("users"),
    serverId: v.id("generatedServers"),
    serviceName: v.string(),
    encryptedKey: v.string(),
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
      await ctx.db.patch(existingKey._id, {
        serverId: args.serverId,
        serviceKey: args.encryptedKey,
        keyName: args.keyName,
        lastUsed: Date.now(),
      });
      return existingKey._id;
    } else {
      const keyId = await ctx.db.insert("externalApiKeys", {
        userId: args.userId,
        serverId: args.serverId,
        serviceName: args.serviceName,
        serviceKey: args.encryptedKey,
        keyName: args.keyName,
        createdAt: Date.now(),
      });
      return keyId;
    }
  },
});

/**
 * Get external API key metadata for a user and service (for UI - does not expose key)
 */
export const getExternalApiKey = query({
  args: {
    userId: v.id("users"),
    serviceName: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("externalApiKeys")
      .withIndex("by_user_and_service", (q) =>
        q.eq("userId", args.userId).eq("serviceName", args.serviceName)
      )
      .first();

    if (!record) {
      return null;
    }

    // Return metadata only, not the actual key (which is encrypted anyway)
    return {
      _id: record._id,
      serviceName: record.serviceName,
      keyName: record.keyName,
      createdAt: record.createdAt,
      lastUsed: record.lastUsed,
      hasKey: true,
    };
  },
});

/**
 * Internal query to get the full encrypted key record
 */
export const _getEncryptedApiKeyInternal = query({
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
 * Get all external API keys for a specific server
 * Keys are stored per-user-per-service, so we look up the server's owner
 * and return all their keys that match the server's required services
 */
export const listExternalApiKeysForServer = query({
  args: { serverId: v.id("generatedServers") },
  handler: async (ctx, args) => {
    // Get the server to find its owner
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      return [];
    }

    // Get all keys for this user
    const keys = await ctx.db
      .query("externalApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", server.userId))
      .collect();

    // Return metadata only, not the actual keys
    return keys.map((key) => ({
      _id: key._id,
      serviceName: key.serviceName,
      keyName: key.keyName,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
    }));
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
