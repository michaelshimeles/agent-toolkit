import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new integration
 */
export const createIntegration = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    iconUrl: v.optional(v.string()),
    category: v.string(),
    status: v.union(v.literal("active"), v.literal("beta"), v.literal("deprecated")),
    functionPath: v.string(),
    tools: v.array(v.object({
      name: v.string(),
      description: v.string(),
      schema: v.any(),
    })),
    resources: v.array(v.object({
      uriTemplate: v.string(),
      description: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Check if integration with this slug already exists
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Integration with slug '${args.slug}' already exists`);
    }

    const integrationId = await ctx.db.insert("integrations", args);
    return integrationId;
  },
});

/**
 * Update an existing integration
 */
export const updateIntegration = mutation({
  args: {
    integrationId: v.id("integrations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("beta"), v.literal("deprecated"))),
    functionPath: v.optional(v.string()),
    tools: v.optional(v.array(v.object({
      name: v.string(),
      description: v.string(),
      schema: v.any(),
    }))),
    resources: v.optional(v.array(v.object({
      uriTemplate: v.string(),
      description: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const { integrationId, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(integrationId, cleanUpdates);
  },
});

/**
 * Get integration by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Get integration by ID
 */
export const getById = query({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.integrationId);
  },
});

/**
 * List all active integrations
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("integrations")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

/**
 * List integrations by category
 */
export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("integrations")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

/**
 * List all integrations
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("integrations").collect();
  },
});

/**
 * Enable an integration for a user
 */
export const enableIntegration = mutation({
  args: {
    userId: v.id("users"),
    integrationId: v.id("integrations"),
    oauthTokenEncrypted: v.optional(v.string()),
    tokenIssuedAt: v.optional(v.number()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("userIntegrations")
      .withIndex("by_user_and_integration", (q) =>
        q.eq("userId", args.userId).eq("integrationId", args.integrationId)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        enabled: true,
        oauthTokenEncrypted: args.oauthTokenEncrypted,
        tokenIssuedAt: args.tokenIssuedAt,
        config: args.config,
      });
      return existing._id;
    }

    // Create new
    const userIntegrationId = await ctx.db.insert("userIntegrations", {
      userId: args.userId,
      integrationId: args.integrationId,
      enabled: true,
      oauthTokenEncrypted: args.oauthTokenEncrypted,
      tokenIssuedAt: args.tokenIssuedAt,
      config: args.config,
    });

    return userIntegrationId;
  },
});

/**
 * Enable an integration for the current user (used from authenticated endpoints)
 */
export const enableUserIntegration = mutation({
  args: {
    integrationId: v.id("integrations"),
    oauthTokenEncrypted: v.optional(v.string()),
    tokenIssuedAt: v.optional(v.number()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get userId from Clerk authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user in database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already exists
    const existing = await ctx.db
      .query("userIntegrations")
      .withIndex("by_user_and_integration", (q) =>
        q.eq("userId", user._id).eq("integrationId", args.integrationId)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        enabled: true,
        oauthTokenEncrypted: args.oauthTokenEncrypted,
        tokenIssuedAt: args.tokenIssuedAt,
        config: args.config,
      });
      return existing._id;
    }

    // Create new
    const userIntegrationId = await ctx.db.insert("userIntegrations", {
      userId: user._id,
      integrationId: args.integrationId,
      enabled: true,
      oauthTokenEncrypted: args.oauthTokenEncrypted,
      tokenIssuedAt: args.tokenIssuedAt,
      config: args.config,
    });

    return userIntegrationId;
  },
});

/**
 * Disable an integration for a user
 */
export const disableIntegration = mutation({
  args: {
    userId: v.id("users"),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, args) => {
    const userIntegration = await ctx.db
      .query("userIntegrations")
      .withIndex("by_user_and_integration", (q) =>
        q.eq("userId", args.userId).eq("integrationId", args.integrationId)
      )
      .first();

    if (userIntegration) {
      await ctx.db.patch(userIntegration._id, { enabled: false });
    }
  },
});

/**
 * Get user's connection for a specific integration
 */
export const getUserConnection = query({
  args: {
    userId: v.id("users"),
    integrationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    // First get the integration by slug
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_slug", (q) => q.eq("slug", args.integrationSlug))
      .first();

    if (!integration) {
      return null;
    }

    // Then get the user's connection
    return await ctx.db
      .query("userIntegrations")
      .withIndex("by_user_and_integration", (q) =>
        q.eq("userId", args.userId).eq("integrationId", integration._id)
      )
      .first();
  },
});

/**
 * List all integrations enabled for a user
 */
export const listUserIntegrations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userIntegrations = await ctx.db
      .query("userIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();

    // Fetch full integration details
    const integrations = await Promise.all(
      userIntegrations.map(async (ui) => {
        const integration = await ctx.db.get(ui.integrationId);
        return {
          ...integration,
          userConfig: ui.config,
        };
      })
    );

    return integrations;
  },
});

/**
 * Delete an integration
 */
export const deleteIntegration = mutation({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    // Delete all user integrations
    const userIntegrations = await ctx.db
      .query("userIntegrations")
      .filter((q) => q.eq(q.field("integrationId"), args.integrationId))
      .collect();

    for (const ui of userIntegrations) {
      await ctx.db.delete(ui._id);
    }

    // Delete the integration
    await ctx.db.delete(args.integrationId);
  },
});
