import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get user settings by user ID
 */
export const getUserSettings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Save or update Anthropic API key
 */
export const saveAnthropicApiKey = mutation({
  args: {
    userId: v.id("users"),
    encryptedApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        anthropicApiKey: args.encryptedApiKey,
        updatedAt: now,
      });
      return existingSettings._id;
    }

    return await ctx.db.insert("userSettings", {
      userId: args.userId,
      anthropicApiKey: args.encryptedApiKey,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Delete Anthropic API key
 */
export const deleteAnthropicApiKey = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        anthropicApiKey: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Check if user has an Anthropic API key configured
 */
export const hasAnthropicApiKey = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return !!settings?.anthropicApiKey;
  },
});
