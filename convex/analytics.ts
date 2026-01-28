import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Log an anonymous tool call for analytics.
 * This mutation accepts all anonymized data and stores it without user identification.
 */
export const logToolCall = mutation({
  args: {
    // Core fields
    sessionHash: v.string(),
    serverId: v.optional(v.id("generatedServers")),
    integrationSlug: v.optional(v.string()),
    toolName: v.string(),

    // Model & Client
    modelId: v.optional(v.string()),
    clientId: v.optional(v.string()),
    clientVersion: v.optional(v.string()),

    // Execution metrics
    latencyMs: v.number(),
    status: v.union(
      v.literal("success"),
      v.literal("error"),
      v.literal("rate_limited")
    ),
    errorCategory: v.optional(v.string()),
    inputTokenEstimate: v.optional(v.number()),
    outputTokenEstimate: v.optional(v.number()),

    // Retry & Agent loop
    isRetry: v.boolean(),
    retryCount: v.number(),
    sessionCallIndex: v.number(),
    agentLoopDepth: v.optional(v.number()),

    // Execution mode
    executionMode: v.union(v.literal("sequential"), v.literal("parallel")),
    batchId: v.optional(v.string()),
    batchSize: v.optional(v.number()),

    // Parameter complexity
    parameterSchema: v.optional(v.any()),
    paramDepth: v.optional(v.number()),
    paramCount: v.optional(v.number()),
    arrayMaxLength: v.optional(v.number()),

    // Geographic & Rate limiting
    geoRegion: v.optional(v.string()),
    hitRateLimit: v.boolean(),
    rateLimitType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const date = new Date(now);

    await ctx.db.insert("anonymousToolCalls", {
      ...args,
      timestamp: now,
      dayOfWeek: date.getUTCDay(),
    });
  },
});

// ============================================================================
// CORE QUERIES
// ============================================================================

/**
 * Get tool usage frequency for a date range.
 */
export const getToolFrequency = query({
  args: {
    startDate: v.optional(v.string()), // "YYYY-MM-DD"
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get from aggregates if available
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    // Group by tool name and sum counts
    const toolCounts = new Map<string, number>();
    for (const agg of aggregates) {
      const current = toolCounts.get(agg.toolName) || 0;
      toolCounts.set(agg.toolName, current + agg.callCount);
    }

    // Sort by count descending
    const sorted = Array.from(toolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([toolName, count]) => ({ toolName, count }));
  },
});

/**
 * Get latency statistics with percentiles.
 */
export const getLatencyStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    toolName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }
    if (args.toolName) {
      aggregates = aggregates.filter((a) => a.toolName === args.toolName);
    }

    if (aggregates.length === 0) {
      return null;
    }

    // Calculate weighted averages
    let totalCalls = 0;
    let weightedLatency = 0;
    let weightedP50 = 0;
    let weightedP95 = 0;
    let weightedP99 = 0;

    for (const agg of aggregates) {
      totalCalls += agg.callCount;
      weightedLatency += agg.avgLatencyMs * agg.callCount;
      if (agg.p50LatencyMs) weightedP50 += agg.p50LatencyMs * agg.callCount;
      if (agg.p95LatencyMs) weightedP95 += agg.p95LatencyMs * agg.callCount;
      if (agg.p99LatencyMs) weightedP99 += agg.p99LatencyMs * agg.callCount;
    }

    return {
      avgLatencyMs: Math.round(weightedLatency / totalCalls),
      p50LatencyMs: Math.round(weightedP50 / totalCalls),
      p95LatencyMs: Math.round(weightedP95 / totalCalls),
      p99LatencyMs: Math.round(weightedP99 / totalCalls),
      totalCalls,
    };
  },
});

/**
 * Get success/error/rate-limited rates.
 */
export const getSuccessRates = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    groupBy: v.optional(v.union(v.literal("tool"), v.literal("date"))),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    if (args.groupBy === "tool") {
      const byTool = new Map<
        string,
        { success: number; error: number; rateLimited: number; total: number }
      >();

      for (const agg of aggregates) {
        const current = byTool.get(agg.toolName) || {
          success: 0,
          error: 0,
          rateLimited: 0,
          total: 0,
        };
        current.success += agg.successCount;
        current.error += agg.errorCount;
        current.rateLimited += agg.rateLimitedCount;
        current.total += agg.callCount;
        byTool.set(agg.toolName, current);
      }

      return Array.from(byTool.entries()).map(([toolName, stats]) => ({
        toolName,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
        errorRate: stats.total > 0 ? stats.error / stats.total : 0,
        rateLimitRate: stats.total > 0 ? stats.rateLimited / stats.total : 0,
        ...stats,
      }));
    }

    if (args.groupBy === "date") {
      const byDate = new Map<
        string,
        { success: number; error: number; rateLimited: number; total: number }
      >();

      for (const agg of aggregates) {
        const current = byDate.get(agg.date) || {
          success: 0,
          error: 0,
          rateLimited: 0,
          total: 0,
        };
        current.success += agg.successCount;
        current.error += agg.errorCount;
        current.rateLimited += agg.rateLimitedCount;
        current.total += agg.callCount;
        byDate.set(agg.date, current);
      }

      return Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, stats]) => ({
          date,
          successRate: stats.total > 0 ? stats.success / stats.total : 0,
          errorRate: stats.total > 0 ? stats.error / stats.total : 0,
          rateLimitRate: stats.total > 0 ? stats.rateLimited / stats.total : 0,
          ...stats,
        }));
    }

    // Overall stats
    let success = 0,
      error = 0,
      rateLimited = 0,
      total = 0;
    for (const agg of aggregates) {
      success += agg.successCount;
      error += agg.errorCount;
      rateLimited += agg.rateLimitedCount;
      total += agg.callCount;
    }

    return {
      successRate: total > 0 ? success / total : 0,
      errorRate: total > 0 ? error / total : 0,
      rateLimitRate: total > 0 ? rateLimited / total : 0,
      success,
      error,
      rateLimited,
      total,
    };
  },
});

/**
 * Get time-of-day usage patterns.
 */
export const getTimePatterns = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    // Sum up hourly distributions
    const hourlyTotals = new Array(24).fill(0);
    for (const agg of aggregates) {
      if (agg.hourlyDistribution) {
        for (let i = 0; i < 24; i++) {
          hourlyTotals[i] += agg.hourlyDistribution[i] || 0;
        }
      }
    }

    // Also get day-of-week patterns from raw data
    const rawCalls = await ctx.db.query("anonymousToolCalls").collect();
    const dayOfWeekCounts = new Array(7).fill(0);
    for (const call of rawCalls) {
      dayOfWeekCounts[call.dayOfWeek]++;
    }

    return {
      hourly: hourlyTotals.map((count, hour) => ({ hour, count })),
      dayOfWeek: dayOfWeekCounts.map((count, day) => ({
        day,
        dayName: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day],
        count,
      })),
    };
  },
});

/**
 * Get common tool sequences/workflows.
 */
export const getToolSequences = query({
  args: {
    limit: v.optional(v.number()),
    minOccurrences: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const minOccurrences = args.minOccurrences ?? 2;

    const sequences = await ctx.db
      .query("toolSequences")
      .withIndex("by_occurrences")
      .order("desc")
      .collect();

    return sequences
      .filter((s) => s.occurrences >= minOccurrences)
      .slice(0, limit)
      .map((s) => ({
        tools: s.tools,
        occurrences: s.occurrences,
        avgDuration: s.avgSessionDuration,
        successRate: s.successRate,
      }));
  },
});

/**
 * Get token usage statistics.
 */
export const getTokenUsage = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    groupBy: v.optional(v.union(v.literal("tool"), v.literal("model"), v.literal("date"))),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    // Calculate totals
    let totalInput = 0;
    let totalOutput = 0;
    let totalCalls = 0;

    for (const agg of aggregates) {
      totalInput += agg.totalInputTokens || 0;
      totalOutput += agg.totalOutputTokens || 0;
      totalCalls += agg.callCount;
    }

    if (args.groupBy === "tool") {
      const byTool = new Map<string, { input: number; output: number; calls: number }>();
      for (const agg of aggregates) {
        const current = byTool.get(agg.toolName) || { input: 0, output: 0, calls: 0 };
        current.input += agg.totalInputTokens || 0;
        current.output += agg.totalOutputTokens || 0;
        current.calls += agg.callCount;
        byTool.set(agg.toolName, current);
      }
      return Array.from(byTool.entries()).map(([toolName, stats]) => ({
        toolName,
        avgInputTokens: stats.calls > 0 ? Math.round(stats.input / stats.calls) : 0,
        avgOutputTokens: stats.calls > 0 ? Math.round(stats.output / stats.calls) : 0,
        totalInputTokens: stats.input,
        totalOutputTokens: stats.output,
        calls: stats.calls,
      }));
    }

    if (args.groupBy === "date") {
      const byDate = new Map<string, { input: number; output: number; calls: number }>();
      for (const agg of aggregates) {
        const current = byDate.get(agg.date) || { input: 0, output: 0, calls: 0 };
        current.input += agg.totalInputTokens || 0;
        current.output += agg.totalOutputTokens || 0;
        current.calls += agg.callCount;
        byDate.set(agg.date, current);
      }
      return Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, stats]) => ({
          date,
          avgInputTokens: stats.calls > 0 ? Math.round(stats.input / stats.calls) : 0,
          avgOutputTokens: stats.calls > 0 ? Math.round(stats.output / stats.calls) : 0,
          totalInputTokens: stats.input,
          totalOutputTokens: stats.output,
          calls: stats.calls,
        }));
    }

    return {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      avgInputTokens: totalCalls > 0 ? Math.round(totalInput / totalCalls) : 0,
      avgOutputTokens: totalCalls > 0 ? Math.round(totalOutput / totalCalls) : 0,
      totalCalls,
    };
  },
});

// ============================================================================
// MODEL & CLIENT QUERIES
// ============================================================================

/**
 * Get usage distribution by AI model.
 */
export const getModelDistribution = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    const modelCounts = new Map<string, number>();
    for (const agg of aggregates) {
      if (agg.byModel) {
        for (const [model, count] of Object.entries(agg.byModel as Record<string, number>)) {
          modelCounts.set(model, (modelCounts.get(model) || 0) + count);
        }
      }
    }

    const total = Array.from(modelCounts.values()).reduce((a, b) => a + b, 0);

    return Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([modelId, count]) => ({
        modelId,
        count,
        percentage: total > 0 ? count / total : 0,
      }));
  },
});

/**
 * Get usage distribution by client/SDK.
 */
export const getClientDistribution = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    const clientCounts = new Map<string, number>();
    for (const agg of aggregates) {
      if (agg.byClient) {
        for (const [client, count] of Object.entries(agg.byClient as Record<string, number>)) {
          clientCounts.set(client, (clientCounts.get(client) || 0) + count);
        }
      }
    }

    const total = Array.from(clientCounts.values()).reduce((a, b) => a + b, 0);

    return Array.from(clientCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([clientId, count]) => ({
        clientId,
        count,
        percentage: total > 0 ? count / total : 0,
      }));
  },
});

/**
 * Get model x tool usage matrix.
 */
export const getModelToolMatrix = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For this, we need raw data since aggregates don't store this cross-reference
    let calls = await ctx.db.query("anonymousToolCalls").collect();

    if (args.startDate) {
      const startTs = new Date(args.startDate).getTime();
      calls = calls.filter((c) => c.timestamp >= startTs);
    }
    if (args.endDate) {
      const endTs = new Date(args.endDate).getTime() + 24 * 60 * 60 * 1000;
      calls = calls.filter((c) => c.timestamp < endTs);
    }

    const matrix = new Map<string, Map<string, number>>();

    for (const call of calls) {
      const model = call.modelId || "unknown";
      const tool = call.toolName;

      if (!matrix.has(model)) {
        matrix.set(model, new Map());
      }
      const toolMap = matrix.get(model)!;
      toolMap.set(tool, (toolMap.get(tool) || 0) + 1);
    }

    // Convert to array format
    const result: Array<{ modelId: string; toolName: string; count: number }> = [];
    for (const [modelId, tools] of matrix) {
      for (const [toolName, count] of tools) {
        result.push({ modelId, toolName, count });
      }
    }

    return result.sort((a, b) => b.count - a.count);
  },
});

// ============================================================================
// AGENT BEHAVIOR QUERIES
// ============================================================================

/**
 * Get retry patterns and rates.
 */
export const getRetryPatterns = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    const byTool = new Map<string, { retryRate: number; avgRetryCount: number; calls: number }>();

    for (const agg of aggregates) {
      const current = byTool.get(agg.toolName) || { retryRate: 0, avgRetryCount: 0, calls: 0 };
      // Weighted average
      const totalCalls = current.calls + agg.callCount;
      current.retryRate =
        (current.retryRate * current.calls + (agg.retryRate || 0) * agg.callCount) / totalCalls;
      current.avgRetryCount =
        (current.avgRetryCount * current.calls + (agg.avgRetryCount || 0) * agg.callCount) /
        totalCalls;
      current.calls = totalCalls;
      byTool.set(agg.toolName, current);
    }

    return Array.from(byTool.entries())
      .sort((a, b) => b[1].retryRate - a[1].retryRate)
      .map(([toolName, stats]) => ({
        toolName,
        retryRate: stats.retryRate,
        avgRetryCount: stats.avgRetryCount,
        calls: stats.calls,
      }));
  },
});

/**
 * Get agent loop depth statistics.
 */
export const getLoopDepthStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let calls = await ctx.db.query("anonymousToolCalls").collect();

    if (args.startDate) {
      const startTs = new Date(args.startDate).getTime();
      calls = calls.filter((c) => c.timestamp >= startTs);
    }
    if (args.endDate) {
      const endTs = new Date(args.endDate).getTime() + 24 * 60 * 60 * 1000;
      calls = calls.filter((c) => c.timestamp < endTs);
    }

    const depthCounts = new Map<number, number>();
    for (const call of calls) {
      const depth = call.agentLoopDepth || 1;
      depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1);
    }

    const distribution = Array.from(depthCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([depth, count]) => ({ depth, count }));

    const total = calls.length;
    const avgDepth =
      total > 0
        ? calls.reduce((sum, c) => sum + (c.agentLoopDepth || 1), 0) / total
        : 0;

    return {
      distribution,
      avgDepth,
      maxDepth: Math.max(...depthCounts.keys(), 0),
      totalCalls: total,
    };
  },
});

/**
 * Get execution mode statistics (parallel vs sequential).
 */
export const getExecutionModeStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    let totalCalls = 0;
    let parallelCalls = 0;
    let totalBatchSize = 0;
    let batchCount = 0;

    for (const agg of aggregates) {
      totalCalls += agg.callCount;
      if (agg.parallelCallRate) {
        parallelCalls += agg.callCount * agg.parallelCallRate;
      }
      if (agg.avgBatchSize && agg.parallelCallRate) {
        totalBatchSize += agg.avgBatchSize * agg.callCount * agg.parallelCallRate;
        batchCount += agg.callCount * agg.parallelCallRate;
      }
    }

    return {
      parallelRate: totalCalls > 0 ? parallelCalls / totalCalls : 0,
      sequentialRate: totalCalls > 0 ? 1 - parallelCalls / totalCalls : 1,
      avgBatchSize: batchCount > 0 ? totalBatchSize / batchCount : 1,
      totalCalls,
    };
  },
});

// ============================================================================
// GEOGRAPHIC & RATE LIMIT QUERIES
// ============================================================================

/**
 * Get usage distribution by geographic region.
 */
export const getGeoDistribution = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    const regionCounts = new Map<string, number>();
    for (const agg of aggregates) {
      if (agg.byRegion) {
        for (const [region, count] of Object.entries(agg.byRegion as Record<string, number>)) {
          regionCounts.set(region, (regionCounts.get(region) || 0) + count);
        }
      }
    }

    const total = Array.from(regionCounts.values()).reduce((a, b) => a + b, 0);

    return Array.from(regionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([region, count]) => ({
        region,
        count,
        percentage: total > 0 ? count / total : 0,
      }));
  },
});

/**
 * Get rate limit statistics.
 */
export const getRateLimitStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    const byTool = new Map<string, { hitRate: number; calls: number }>();
    const byType = new Map<string, number>();
    let totalCalls = 0;
    let totalHits = 0;

    for (const agg of aggregates) {
      totalCalls += agg.callCount;
      totalHits += agg.rateLimitedCount;

      const current = byTool.get(agg.toolName) || { hitRate: 0, calls: 0 };
      current.calls += agg.callCount;
      current.hitRate =
        (current.hitRate * (current.calls - agg.callCount) +
          (agg.rateLimitHitRate || 0) * agg.callCount) /
        current.calls;
      byTool.set(agg.toolName, current);

      if (agg.byRateLimitType) {
        for (const [type, count] of Object.entries(agg.byRateLimitType as Record<string, number>)) {
          byType.set(type, (byType.get(type) || 0) + count);
        }
      }
    }

    return {
      overallHitRate: totalCalls > 0 ? totalHits / totalCalls : 0,
      totalHits,
      totalCalls,
      byTool: Array.from(byTool.entries())
        .sort((a, b) => b[1].hitRate - a[1].hitRate)
        .map(([toolName, stats]) => ({ toolName, ...stats })),
      byType: Array.from(byType.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
    };
  },
});

// ============================================================================
// COMPLEXITY QUERIES
// ============================================================================

/**
 * Get parameter complexity statistics.
 */
export const getComplexityStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let calls = await ctx.db.query("anonymousToolCalls").collect();

    if (args.startDate) {
      const startTs = new Date(args.startDate).getTime();
      calls = calls.filter((c) => c.timestamp >= startTs);
    }
    if (args.endDate) {
      const endTs = new Date(args.endDate).getTime() + 24 * 60 * 60 * 1000;
      calls = calls.filter((c) => c.timestamp < endTs);
    }

    const depths: number[] = [];
    const counts: number[] = [];
    const arrayLengths: number[] = [];

    for (const call of calls) {
      if (call.paramDepth !== undefined) depths.push(call.paramDepth);
      if (call.paramCount !== undefined) counts.push(call.paramCount);
      if (call.arrayMaxLength !== undefined) arrayLengths.push(call.arrayMaxLength);
    }

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const max = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : 0);

    return {
      avgDepth: avg(depths),
      maxDepth: max(depths),
      avgParamCount: avg(counts),
      maxParamCount: max(counts),
      avgArrayLength: avg(arrayLengths),
      maxArrayLength: max(arrayLengths),
      totalCalls: calls.length,
    };
  },
});

// ============================================================================
// OVERVIEW QUERY (for dashboard)
// ============================================================================

/**
 * Get overview stats for the analytics dashboard.
 */
export const getOverviewStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let aggregates = await ctx.db.query("analyticsAggregates").collect();

    if (args.startDate) {
      aggregates = aggregates.filter((a) => a.date >= args.startDate!);
    }
    if (args.endDate) {
      aggregates = aggregates.filter((a) => a.date <= args.endDate!);
    }

    let totalCalls = 0;
    let successCalls = 0;
    let errorCalls = 0;
    let rateLimitedCalls = 0;
    let totalLatency = 0;
    const uniqueTools = new Set<string>();
    const modelCounts = new Map<string, number>();
    const clientCounts = new Map<string, number>();
    let retrySum = 0;
    let rateLimitHitSum = 0;

    for (const agg of aggregates) {
      totalCalls += agg.callCount;
      successCalls += agg.successCount;
      errorCalls += agg.errorCount;
      rateLimitedCalls += agg.rateLimitedCount;
      totalLatency += agg.avgLatencyMs * agg.callCount;
      uniqueTools.add(agg.toolName);

      if (agg.retryRate) retrySum += agg.retryRate * agg.callCount;
      if (agg.rateLimitHitRate) rateLimitHitSum += agg.rateLimitHitRate * agg.callCount;

      if (agg.byModel) {
        for (const [model, count] of Object.entries(agg.byModel as Record<string, number>)) {
          modelCounts.set(model, (modelCounts.get(model) || 0) + count);
        }
      }
      if (agg.byClient) {
        for (const [client, count] of Object.entries(agg.byClient as Record<string, number>)) {
          clientCounts.set(client, (clientCounts.get(client) || 0) + count);
        }
      }
    }

    // Find most popular model and client
    let topModel = "unknown";
    let topModelCount = 0;
    for (const [model, count] of modelCounts) {
      if (count > topModelCount) {
        topModel = model;
        topModelCount = count;
      }
    }

    let topClient = "unknown";
    let topClientCount = 0;
    for (const [client, count] of clientCounts) {
      if (count > topClientCount) {
        topClient = client;
        topClientCount = count;
      }
    }

    return {
      totalCalls,
      successRate: totalCalls > 0 ? successCalls / totalCalls : 0,
      errorRate: totalCalls > 0 ? errorCalls / totalCalls : 0,
      avgLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
      uniqueToolsCount: uniqueTools.size,
      retryRate: totalCalls > 0 ? retrySum / totalCalls : 0,
      rateLimitHitRate: totalCalls > 0 ? rateLimitHitSum / totalCalls : 0,
      topModel,
      topClient,
    };
  },
});

// ============================================================================
// SCHEDULED AGGREGATION (Internal mutations)
// ============================================================================

/**
 * Internal mutation to compute daily aggregates from raw data.
 * This should be called by a scheduled job daily.
 */
export const computeDailyAggregates = internalMutation({
  args: {
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const dateStart = new Date(args.date).getTime();
    const dateEnd = dateStart + 24 * 60 * 60 * 1000;

    // Get all calls for this date
    const calls = await ctx.db
      .query("anonymousToolCalls")
      .withIndex("by_timestamp")
      .filter((q) => q.and(q.gte(q.field("timestamp"), dateStart), q.lt(q.field("timestamp"), dateEnd)))
      .collect();

    if (calls.length === 0) return;

    // Group by tool
    const byTool = new Map<string, typeof calls>();
    for (const call of calls) {
      const existing = byTool.get(call.toolName) || [];
      existing.push(call);
      byTool.set(call.toolName, existing);
    }

    // Create aggregates for each tool
    for (const [toolName, toolCalls] of byTool) {
      const latencies = toolCalls.map((c) => c.latencyMs).sort((a, b) => a - b);
      const successCount = toolCalls.filter((c) => c.status === "success").length;
      const errorCount = toolCalls.filter((c) => c.status === "error").length;
      const rateLimitedCount = toolCalls.filter((c) => c.status === "rate_limited").length;

      // Calculate percentiles
      const p50Idx = Math.floor(latencies.length * 0.5);
      const p95Idx = Math.floor(latencies.length * 0.95);
      const p99Idx = Math.floor(latencies.length * 0.99);

      // Hourly distribution
      const hourlyDistribution = new Array(24).fill(0);
      for (const call of toolCalls) {
        const hour = new Date(call.timestamp).getUTCHours();
        hourlyDistribution[hour]++;
      }

      // Model & Client counts
      const byModel: Record<string, number> = {};
      const byClient: Record<string, number> = {};
      const byRegion: Record<string, number> = {};
      const byRateLimitType: Record<string, number> = {};

      let retryCount = 0;
      let parallelCount = 0;
      let totalBatchSize = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalParamDepth = 0;
      let totalParamCount = 0;
      let rateLimitHits = 0;

      for (const call of toolCalls) {
        if (call.modelId) byModel[call.modelId] = (byModel[call.modelId] || 0) + 1;
        if (call.clientId) byClient[call.clientId] = (byClient[call.clientId] || 0) + 1;
        if (call.geoRegion) byRegion[call.geoRegion] = (byRegion[call.geoRegion] || 0) + 1;
        if (call.hitRateLimit && call.rateLimitType) {
          byRateLimitType[call.rateLimitType] = (byRateLimitType[call.rateLimitType] || 0) + 1;
        }

        if (call.isRetry) retryCount++;
        if (call.executionMode === "parallel") {
          parallelCount++;
          totalBatchSize += call.batchSize || 1;
        }
        if (call.inputTokenEstimate) totalInputTokens += call.inputTokenEstimate;
        if (call.outputTokenEstimate) totalOutputTokens += call.outputTokenEstimate;
        if (call.paramDepth) totalParamDepth += call.paramDepth;
        if (call.paramCount) totalParamCount += call.paramCount;
        if (call.hitRateLimit) rateLimitHits++;
      }

      const integrationSlug = toolCalls[0]?.integrationSlug;

      // Check if aggregate already exists for this date/tool
      const existing = await ctx.db
        .query("analyticsAggregates")
        .withIndex("by_date_tool", (q) => q.eq("date", args.date).eq("toolName", toolName))
        .first();

      const aggregateData = {
        date: args.date,
        integrationSlug,
        toolName,
        callCount: toolCalls.length,
        successCount,
        errorCount,
        rateLimitedCount,
        avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
        p50LatencyMs: latencies[p50Idx] || 0,
        p95LatencyMs: latencies[p95Idx] || 0,
        p99LatencyMs: latencies[p99Idx] || 0,
        avgInputTokens: toolCalls.length > 0 ? Math.round(totalInputTokens / toolCalls.length) : 0,
        avgOutputTokens: toolCalls.length > 0 ? Math.round(totalOutputTokens / toolCalls.length) : 0,
        totalInputTokens,
        totalOutputTokens,
        hourlyDistribution,
        byModel,
        byClient,
        retryRate: toolCalls.length > 0 ? retryCount / toolCalls.length : 0,
        avgRetryCount: retryCount > 0 ? retryCount / toolCalls.length : 0,
        avgLoopDepth: undefined, // Could calculate if needed
        parallelCallRate: toolCalls.length > 0 ? parallelCount / toolCalls.length : 0,
        avgBatchSize: parallelCount > 0 ? totalBatchSize / parallelCount : 1,
        avgParamDepth: toolCalls.length > 0 ? totalParamDepth / toolCalls.length : 0,
        avgParamCount: toolCalls.length > 0 ? totalParamCount / toolCalls.length : 0,
        byRegion,
        rateLimitHitRate: toolCalls.length > 0 ? rateLimitHits / toolCalls.length : 0,
        byRateLimitType,
      };

      if (existing) {
        await ctx.db.patch(existing._id, aggregateData);
      } else {
        await ctx.db.insert("analyticsAggregates", aggregateData);
      }
    }
  },
});

/**
 * Internal mutation to update tool sequences from session data.
 */
export const updateToolSequences = internalMutation({
  args: {
    sessionHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all calls for this session, ordered by time
    const calls = await ctx.db
      .query("anonymousToolCalls")
      .withIndex("by_session", (q) => q.eq("sessionHash", args.sessionHash))
      .collect();

    if (calls.length < 2) return; // Need at least 2 calls for a sequence

    // Sort by timestamp
    calls.sort((a, b) => a.timestamp - b.timestamp);

    // Extract tool sequence
    const tools = calls.map((c) => c.toolName);
    const sequenceHash = tools.join("→");
    const duration = calls[calls.length - 1].timestamp - calls[0].timestamp;
    const successRate = calls.filter((c) => c.status === "success").length / calls.length;

    // Update or create sequence
    const existing = await ctx.db
      .query("toolSequences")
      .withIndex("by_hash", (q) => q.eq("sequenceHash", sequenceHash))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        occurrences: existing.occurrences + 1,
        avgSessionDuration: existing.avgSessionDuration
          ? (existing.avgSessionDuration * existing.occurrences + duration) / (existing.occurrences + 1)
          : duration,
        successRate: existing.successRate
          ? (existing.successRate * existing.occurrences + successRate) / (existing.occurrences + 1)
          : successRate,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.insert("toolSequences", {
        sequenceHash,
        tools,
        occurrences: 1,
        avgSessionDuration: duration,
        successRate,
        lastSeen: Date.now(),
      });
    }
  },
});

/**
 * Internal mutation to purge old raw data (keep aggregates).
 */
export const purgeOldRawData = internalMutation({
  args: {
    daysToKeep: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.daysToKeep * 24 * 60 * 60 * 1000;

    const oldCalls = await ctx.db
      .query("anonymousToolCalls")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoff))
      .collect();

    for (const call of oldCalls) {
      await ctx.db.delete(call._id);
    }

    return { deleted: oldCalls.length };
  },
});
