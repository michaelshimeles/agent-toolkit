import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { encrypt, decrypt } from "../lib/encryption";

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
 * Store external API key for a server (encrypted)
 */
export const storeExternalApiKey = action({
  args: {
    userId: v.id("users"),
    serverId: v.id("generatedServers"),
    serviceName: v.string(),
    serviceKey: v.string(),
    keyName: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Encrypt the API key before storage
    const encryptedKey = encrypt(args.serviceKey);

    const result = await ctx.runMutation(api.builder._storeEncryptedApiKey, {
      userId: args.userId,
      serverId: args.serverId,
      serviceName: args.serviceName,
      encryptedKey,
      keyName: args.keyName,
    });
    return result as string;
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
 * Get decrypted external API key (for deployment - action only)
 */
export const getDecryptedApiKey = action({
  args: {
    userId: v.id("users"),
    serviceName: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const record = await ctx.runQuery(api.builder.getExternalApiKey, {
      userId: args.userId,
      serviceName: args.serviceName,
    });

    if (!record) {
      return null;
    }

    // Need to fetch the actual encrypted key from the internal query
    const fullRecord: any = await ctx.runQuery(api.builder._getEncryptedApiKeyInternal, {
      userId: args.userId,
      serviceName: args.serviceName,
    });

    if (!fullRecord) {
      return null;
    }

    // Decrypt the API key
    try {
      return decrypt(fullRecord.serviceKey);
    } catch (error) {
      console.error("Failed to decrypt API key:", error);
      return null;
    }
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
 * Delete external API key
 */
export const deleteExternalApiKey = mutation({
  args: { keyId: v.id("externalApiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.keyId);
  },
});
