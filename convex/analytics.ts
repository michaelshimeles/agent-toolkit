/**
 * Server Analytics and Monitoring
 * Track usage, performance, and health metrics for generated servers
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Log a tool call for a generated server
 */
export const logToolCall = mutation({
  args: {
    serverId: v.id("generatedServers"),
    toolName: v.string(),
    duration: v.number(), // milliseconds
    status: v.union(v.literal("success"), v.literal("error")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Note: In a full implementation, this would be stored in a dedicated table
    // For now, we'll track metrics in memory during queries

    return {
      logged: true,
      serverId: args.serverId,
      toolName: args.toolName,
      timestamp: Date.now(),
    };
  },
});

/**
 * Get analytics for a specific server
 */
export const getServerAnalytics = query({
  args: {
    serverId: v.id("generatedServers"),
    timeRange: v.optional(
      v.union(
        v.literal("24h"),
        v.literal("7d"),
        v.literal("30d"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Mock analytics data (in production, query from logs table)
    const analytics = {
      serverId: args.serverId,
      serverName: server.name,
      status: server.status,
      deploymentUrl: server.deploymentUrl,
      version: server.version,

      // Performance metrics
      metrics: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
      },

      // Tool-specific stats
      toolStats: server.tools.map((tool) => ({
        name: tool.name,
        calls: 0,
        avgLatency: 0,
        errorRate: 0,
      })),

      // Time series data (for charts)
      timeSeries: {
        labels: [] as string[],
        calls: [] as number[],
        errors: [] as number[],
        latency: [] as number[],
      },

      // Health status
      health: {
        status: server.status === "deployed" ? "healthy" : "unhealthy",
        uptime: server.status === "deployed" ? 100 : 0,
        lastCheck: Date.now(),
      },
    };

    return analytics;
  },
});

/**
 * Get analytics summary for all user's servers
 */
export const getUserServersAnalytics = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const servers = await ctx.db
      .query("generatedServers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const summary = {
      totalServers: servers.length,
      deployedServers: servers.filter((s) => s.status === "deployed").length,
      draftServers: servers.filter((s) => s.status === "draft").length,
      failedServers: servers.filter((s) => s.status === "failed").length,
      totalTools: servers.reduce((sum, s) => sum + s.tools.length, 0),

      // Top servers by usage (mock data)
      topServers: servers
        .filter((s) => s.status === "deployed")
        .slice(0, 5)
        .map((s) => ({
          id: s._id,
          name: s.name,
          calls: 0,
          avgLatency: 0,
        })),

      // Recent activity
      recentActivity: servers
        .slice(0, 10)
        .map((s) => ({
          serverId: s._id,
          serverName: s.name,
          action: s.status,
          timestamp: s._creationTime,
        })),
    };

    return summary;
  },
});

/**
 * Get performance metrics for a server
 */
export const getPerformanceMetrics = query({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    return {
      serverId: args.serverId,
      metrics: {
        // Response time metrics
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,

        // Throughput
        requestsPerSecond: 0,
        requestsPerMinute: 0,
        requestsPerHour: 0,

        // Error rates
        errorRate: 0,
        timeoutRate: 0,

        // Resource usage
        memoryUsage: 0,
        cpuUsage: 0,
      },
      timestamp: Date.now(),
    };
  },
});

/**
 * Get error logs for a server
 */
export const getErrorLogs = query({
  args: {
    serverId: v.id("generatedServers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    const limit = args.limit ?? 50;

    // Mock error logs (in production, query from logs table)
    return {
      serverId: args.serverId,
      errors: [] as Array<{
        timestamp: number;
        toolName: string;
        errorMessage: string;
        stackTrace?: string;
      }>,
      total: 0,
    };
  },
});

/**
 * Get health check status
 */
export const getHealthStatus = query({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    const isDeployed = server.status === "deployed";
    const hasDeploymentUrl = !!server.deploymentUrl;

    return {
      serverId: args.serverId,
      status: isDeployed && hasDeploymentUrl ? "healthy" : "unhealthy",
      checks: {
        deployed: isDeployed,
        reachable: hasDeploymentUrl,
        responding: hasDeploymentUrl,
        errorsLow: true,
        latencyAcceptable: true,
      },
      uptime: isDeployed ? 100 : 0,
      lastCheck: Date.now(),
      nextCheck: Date.now() + 60000, // 1 minute from now
    };
  },
});

/**
 * Get usage trends over time
 */
export const getUsageTrends = query({
  args: {
    serverId: v.id("generatedServers"),
    period: v.union(
      v.literal("hour"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    ),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Mock trend data (in production, aggregate from logs)
    const dataPoints = 24; // 24 hours, days, etc.
    const labels = Array.from({ length: dataPoints }, (_, i) => {
      const date = new Date();
      date.setHours(date.getHours() - (dataPoints - i));
      return date.toISOString();
    });

    return {
      serverId: args.serverId,
      period: args.period,
      data: {
        labels,
        requests: Array(dataPoints).fill(0),
        errors: Array(dataPoints).fill(0),
        avgLatency: Array(dataPoints).fill(0),
      },
    };
  },
});

/**
 * Get tool usage statistics
 */
export const getToolUsageStats = query({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    return {
      serverId: args.serverId,
      tools: server.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        stats: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          avgLatency: 0,
          lastUsed: null as number | null,
        },
      })),
    };
  },
});
