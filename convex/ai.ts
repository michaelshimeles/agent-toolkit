/**
 * AI Builder - Convex Queries and Mutations for generated MCP servers
 * Actions are in aiActions.ts (which uses "use node" for Node.js APIs)
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============================================================================
// Mutations
// ============================================================================

// Mutation to create draft server
export const createDraftServer = mutation({
  args: {
    userId: v.id("users"),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    sourceType: v.union(
      v.literal("openapi"),
      v.literal("docs_url"),
      v.literal("github_repo"),
      v.literal("postman"),
      v.literal("text")
    ),
    sourceUrl: v.optional(v.string()),
    code: v.string(),
    tools: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        schema: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const serverId = await ctx.db.insert("generatedServers", {
      userId: args.userId,
      slug: args.slug,
      name: args.name,
      description: args.description,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl,
      code: args.code,
      tools: args.tools,
      status: "draft",
      allowedDomains: [],
      rateLimit: 100,
      version: 1,
    });

    return serverId;
  },
});

// Mutation to update server status
export const updateServerStatus = mutation({
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
  },
  handler: async (ctx, { serverId, status, deploymentUrl }) => {
    await ctx.db.patch(serverId, {
      status,
      ...(deploymentUrl && { deploymentUrl }),
    });
  },
});

// Mutation to update server documentation
export const updateServerDocs = mutation({
  args: {
    serverId: v.id("generatedServers"),
    readme: v.string(),
    toolDocs: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        params: v.string(),
        example: v.string(),
      })
    ),
  },
  handler: async (ctx, { serverId, readme, toolDocs }) => {
    await ctx.db.patch(serverId, {
      readme,
      toolDocs,
    });
  },
});

// ============================================================================
// Queries
// ============================================================================

// Query to list user's generated servers
export const listUserServers = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const servers = await ctx.db
      .query("generatedServers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return servers;
  },
});

// Query to get a specific server
export const getServer = query({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, { serverId }) => {
    const server = await ctx.db.get(serverId);
    return server;
  },
});
