import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get or create user from Clerk webhook
 */
export const upsertUserFromClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
    });

    return userId;
  },
});

/**
 * Get user by Clerk ID
 */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

/**
 * Ensure user exists in Convex (creates if not exists)
 * Call this when user first accesses the app
 */
export const ensureUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
    });

    return await ctx.db.get(userId);
  },
});

/**
 * Get user by API key hash
 */
export const getUserByApiKey = query({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .first();

    if (!apiKey) {
      return null;
    }

    // Note: Cannot update lastUsed in a query function
    // Consider tracking this separately in usage logs

    const user = await ctx.db.get(apiKey.userId);
    return user;
  },
});

/**
 * Create a new API key for a user
 */
export const createApiKey = mutation({
  args: {
    userId: v.id("users"),
    keyHash: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeyId = await ctx.db.insert("apiKeys", {
      userId: args.userId,
      keyHash: args.keyHash,
      name: args.name,
    });

    return apiKeyId;
  },
});

/**
 * List all API keys for a user
 */
export const listApiKeys = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Revoke an API key
 */
export const revokeApiKey = mutation({
  args: { apiKeyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.apiKeyId);
  },
});

/**
 * Delete user and all associated data
 */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Delete all API keys
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const key of apiKeys) {
      await ctx.db.delete(key._id);
    }

    // Delete all user integrations
    const userIntegrations = await ctx.db
      .query("userIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const integration of userIntegrations) {
      await ctx.db.delete(integration._id);
    }

    // Delete user
    await ctx.db.delete(args.userId);
  },
});
