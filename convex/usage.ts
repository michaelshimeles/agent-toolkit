import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Log a tool usage event
 */
export const log = mutation({
  args: {
    userId: v.id("users"),
    integrationId: v.id("integrations"),
    toolName: v.string(),
    latencyMs: v.number(),
    status: v.union(v.literal("success"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("usageLogs", {
      userId: args.userId,
      integrationId: args.integrationId,
      toolName: args.toolName,
      latencyMs: args.latencyMs,
      status: args.status,
    });

    return logId;
  },
});

/**
 * Get usage logs for a user
 */
export const getUserLogs = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const logs = await ctx.db
      .query("usageLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    // Enrich with integration details
    return await Promise.all(
      logs.map(async (log) => {
        const integration = await ctx.db.get(log.integrationId);
        return {
          ...log,
          integrationName: integration?.name,
          integrationSlug: integration?.slug,
        };
      })
    );
  },
});

/**
 * Get usage logs for a specific integration
 */
export const getIntegrationLogs = query({
  args: {
    integrationId: v.id("integrations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    return await ctx.db
      .query("usageLogs")
      .withIndex("by_integration", (q) => q.eq("integrationId", args.integrationId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get usage statistics for a user
 */
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("usageLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const totalRequests = logs.length;
    const successfulRequests = logs.filter((log) => log.status === "success").length;
    const failedRequests = logs.filter((log) => log.status === "error").length;
    const avgLatency =
      logs.length > 0
        ? logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length
        : 0;

    // Group by integration
    const byIntegration: Record<string, number> = {};
    for (const log of logs) {
      const integration = await ctx.db.get(log.integrationId);
      if (integration) {
        byIntegration[integration.slug] = (byIntegration[integration.slug] || 0) + 1;
      }
    }

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgLatency: Math.round(avgLatency),
      byIntegration,
    };
  },
});

/**
 * Get usage statistics for a specific integration
 */
export const getIntegrationStats = query({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("usageLogs")
      .withIndex("by_integration", (q) => q.eq("integrationId", args.integrationId))
      .collect();

    const totalRequests = logs.length;
    const successfulRequests = logs.filter((log) => log.status === "success").length;
    const failedRequests = logs.filter((log) => log.status === "error").length;
    const avgLatency =
      logs.length > 0
        ? logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length
        : 0;

    // Group by tool
    const byTool: Record<string, number> = {};
    for (const log of logs) {
      byTool[log.toolName] = (byTool[log.toolName] || 0) + 1;
    }

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgLatency: Math.round(avgLatency),
      byTool,
    };
  },
});

/**
 * Update billing meter for current period
 */
export const updateBillingMeter = mutation({
  args: {
    userId: v.id("users"),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    // Get existing meter
    const existing = await ctx.db
      .query("billingMeters")
      .withIndex("by_user_period", (q) =>
        q.eq("userId", args.userId).eq("period", args.period)
      )
      .first();

    // Count requests for this period
    const logs = await ctx.db
      .query("usageLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter logs for this period (simple date parsing)
    const periodLogs = logs.filter((log) => {
      const logDate = new Date(log._creationTime);
      const logPeriod = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, "0")}`;
      return logPeriod === args.period;
    });

    const requestCount = periodLogs.length;

    if (existing) {
      await ctx.db.patch(existing._id, { requestCount });
    } else {
      await ctx.db.insert("billingMeters", {
        userId: args.userId,
        period: args.period,
        requestCount,
      });
    }
  },
});

/**
 * Get billing meter for a specific period
 */
export const getBillingMeter = query({
  args: {
    userId: v.id("users"),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("billingMeters")
      .withIndex("by_user_period", (q) =>
        q.eq("userId", args.userId).eq("period", args.period)
      )
      .first();
  },
});

/**
 * Get all billing meters for a user
 */
export const getUserBillingMeters = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("billingMeters")
      .withIndex("by_user_period", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
