"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoadingSkeleton } from "@/components/loading";
import { useState } from "react";

// Simple date range options
const DATE_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
] as const;

function getDateRange(days: number): { startDate?: string; endDate?: string } {
  if (days === 0) return {};
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function StatCard({
  title,
  value,
  subtitle,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="p-6 border border-border/50 rounded-xl">
        <LoadingSkeleton width="w-2/3" className="mb-2" />
        <LoadingSkeleton width="w-1/2" height="h-8" />
      </div>
    );
  }

  return (
    <div className="p-6 border border-border/50 rounded-xl bg-card hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function DistributionBar({
  label,
  count,
  total,
  percentage,
}: {
  label: string;
  count: number;
  total: number;
  percentage?: number;
}) {
  const pct = percentage ?? (total > 0 ? count / total : 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {count.toLocaleString()} ({formatPercentage(pct)})
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-foreground/30 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <h2 className="font-semibold text-lg mb-5 tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

export default function AnalyticsClient() {
  const [selectedRange, setSelectedRange] = useState(1); // Default to 30 days
  const dateRange = getDateRange(DATE_RANGES[selectedRange].days);

  // Fetch all analytics data
  const overview = useQuery(api.analytics.getOverviewStats, dateRange);
  const toolFrequency = useQuery(api.analytics.getToolFrequency, {
    ...dateRange,
    limit: 10,
  });
  const successRates = useQuery(api.analytics.getSuccessRates, {
    ...dateRange,
    groupBy: "tool",
  });
  const modelDistribution = useQuery(api.analytics.getModelDistribution, dateRange);
  const clientDistribution = useQuery(api.analytics.getClientDistribution, dateRange);
  const geoDistribution = useQuery(api.analytics.getGeoDistribution, dateRange);
  const retryPatterns = useQuery(api.analytics.getRetryPatterns, dateRange);
  const executionModeStats = useQuery(api.analytics.getExecutionModeStats, dateRange);
  const rateLimitStats = useQuery(api.analytics.getRateLimitStats, dateRange);
  const toolSequences = useQuery(api.analytics.getToolSequences, {
    limit: 10,
    minOccurrences: 2,
  });
  const timePatterns = useQuery(api.analytics.getTimePatterns, dateRange);

  const loading = overview === undefined;

  return (
    <main className="min-h-screen px-6 py-10 md:py-14">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              Anonymous Analytics
            </h1>
            <p className="text-base text-muted-foreground mt-2 text-pretty">
              Aggregated MCP tool usage data for AI research and insights
            </p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex gap-2">
            {DATE_RANGES.map((range, idx) => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(idx)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedRange === idx
                    ? "bg-foreground text-background"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard
            title="Total Calls"
            value={overview?.totalCalls.toLocaleString() ?? "0"}
            loading={loading}
          />
          <StatCard
            title="Success Rate"
            value={formatPercentage(overview?.successRate ?? 0)}
            subtitle={`Error: ${formatPercentage(overview?.errorRate ?? 0)}`}
            loading={loading}
          />
          <StatCard
            title="Avg Latency"
            value={`${overview?.avgLatencyMs ?? 0}ms`}
            loading={loading}
          />
          <StatCard
            title="Unique Tools"
            value={overview?.uniqueToolsCount ?? 0}
            loading={loading}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard
            title="Retry Rate"
            value={formatPercentage(overview?.retryRate ?? 0)}
            loading={loading}
          />
          <StatCard
            title="Rate Limit Hit Rate"
            value={formatPercentage(overview?.rateLimitHitRate ?? 0)}
            loading={loading}
          />
          <StatCard
            title="Top Model"
            value={overview?.topModel ?? "unknown"}
            loading={loading}
          />
          <StatCard
            title="Top Client"
            value={overview?.topClient ?? "unknown"}
            loading={loading}
          />
        </div>

        {/* Tool Frequency */}
        <Section title="Tool Usage Frequency">
          {toolFrequency === undefined ? (
            <div className="p-6 border border-border/50 rounded-xl">
              <LoadingSkeleton width="w-full" height="h-40" />
            </div>
          ) : toolFrequency.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/50 rounded-xl bg-card">
              <p className="text-sm text-muted-foreground">No tool usage data yet</p>
            </div>
          ) : (
            <div className="p-6 border border-border/50 rounded-xl bg-card space-y-4">
              {toolFrequency.map((tool) => (
                <DistributionBar
                  key={tool.toolName}
                  label={tool.toolName}
                  count={tool.count}
                  total={overview?.totalCalls ?? 0}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Two Column Layout for Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Model Distribution */}
          <div className="p-6 border border-border/50 rounded-xl bg-card">
            <h3 className="font-semibold mb-4">Model Distribution</h3>
            {modelDistribution === undefined ? (
              <LoadingSkeleton width="w-full" height="h-32" />
            ) : modelDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No model data available
              </p>
            ) : (
              <div className="space-y-3">
                {modelDistribution.slice(0, 8).map((item) => (
                  <DistributionBar
                    key={item.modelId}
                    label={item.modelId}
                    count={item.count}
                    total={overview?.totalCalls ?? 0}
                    percentage={item.percentage}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Client Distribution */}
          <div className="p-6 border border-border/50 rounded-xl bg-card">
            <h3 className="font-semibold mb-4">Client Distribution</h3>
            {clientDistribution === undefined ? (
              <LoadingSkeleton width="w-full" height="h-32" />
            ) : clientDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No client data available
              </p>
            ) : (
              <div className="space-y-3">
                {clientDistribution.slice(0, 8).map((item) => (
                  <DistributionBar
                    key={item.clientId}
                    label={item.clientId}
                    count={item.count}
                    total={overview?.totalCalls ?? 0}
                    percentage={item.percentage}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Geographic Distribution */}
        <Section title="Geographic Distribution">
          {geoDistribution === undefined ? (
            <div className="p-6 border border-border/50 rounded-xl">
              <LoadingSkeleton width="w-full" height="h-32" />
            </div>
          ) : geoDistribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/50 rounded-xl bg-card">
              <p className="text-sm text-muted-foreground">No geographic data yet</p>
            </div>
          ) : (
            <div className="p-6 border border-border/50 rounded-xl bg-card">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {geoDistribution.slice(0, 12).map((item) => (
                  <div key={item.region} className="text-center p-3 bg-secondary/50 rounded-lg">
                    <p className="text-2xl font-bold">{item.region}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {item.count.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercentage(item.percentage)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Execution Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Execution Mode */}
          <div className="p-6 border border-border/50 rounded-xl bg-card">
            <h3 className="font-semibold mb-4">Execution Mode</h3>
            {executionModeStats === undefined ? (
              <LoadingSkeleton width="w-full" height="h-24" />
            ) : (
              <div className="space-y-4">
                <DistributionBar
                  label="Sequential"
                  count={Math.round(
                    (executionModeStats.sequentialRate ?? 0) * (executionModeStats.totalCalls ?? 0)
                  )}
                  total={executionModeStats.totalCalls ?? 0}
                  percentage={executionModeStats.sequentialRate}
                />
                <DistributionBar
                  label="Parallel"
                  count={Math.round(
                    (executionModeStats.parallelRate ?? 0) * (executionModeStats.totalCalls ?? 0)
                  )}
                  total={executionModeStats.totalCalls ?? 0}
                  percentage={executionModeStats.parallelRate}
                />
                <p className="text-sm text-muted-foreground">
                  Avg Batch Size: {(executionModeStats.avgBatchSize ?? 1).toFixed(1)}
                </p>
              </div>
            )}
          </div>

          {/* Rate Limits */}
          <div className="p-6 border border-border/50 rounded-xl bg-card">
            <h3 className="font-semibold mb-4">Rate Limit Analysis</h3>
            {rateLimitStats === undefined ? (
              <LoadingSkeleton width="w-full" height="h-24" />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overall Hit Rate</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatPercentage(rateLimitStats.overallHitRate ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Hits</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {(rateLimitStats.totalHits ?? 0).toLocaleString()}
                  </span>
                </div>
                {rateLimitStats.byType && rateLimitStats.byType.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">By Type:</p>
                    {rateLimitStats.byType.slice(0, 3).map((item) => (
                      <div key={item.type} className="flex justify-between text-sm">
                        <span>{item.type}</span>
                        <span className="tabular-nums">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Retry Patterns */}
        <Section title="Retry Patterns by Tool">
          {retryPatterns === undefined ? (
            <div className="p-6 border border-border/50 rounded-xl">
              <LoadingSkeleton width="w-full" height="h-32" />
            </div>
          ) : retryPatterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/50 rounded-xl bg-card">
              <p className="text-sm text-muted-foreground">No retry data available</p>
            </div>
          ) : (
            <div className="border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tool
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Retry Rate
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Avg Retries
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Calls
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border/50">
                  {retryPatterns.slice(0, 10).map((item) => (
                    <tr key={item.toolName} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {item.toolName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums">
                        {formatPercentage(item.retryRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums">
                        {item.avgRetryCount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right tabular-nums">
                        {item.calls.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Success Rates by Tool */}
        <Section title="Success Rates by Tool">
          {successRates === undefined ? (
            <div className="p-6 border border-border/50 rounded-xl">
              <LoadingSkeleton width="w-full" height="h-32" />
            </div>
          ) : !Array.isArray(successRates) || successRates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/50 rounded-xl bg-card">
              <p className="text-sm text-muted-foreground">No success rate data available</p>
            </div>
          ) : (
            <div className="border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tool
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Success
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Error
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rate Limited
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border/50">
                  {successRates.slice(0, 10).map((item: any) => (
                    <tr key={item.toolName} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {item.toolName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="text-green-600 tabular-nums">
                          {formatPercentage(item.successRate)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="text-red-600 tabular-nums">
                          {formatPercentage(item.errorRate)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="text-amber-600 tabular-nums">
                          {formatPercentage(item.rateLimitRate)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right tabular-nums">
                        {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Tool Sequences */}
        <Section title="Common Tool Sequences">
          {toolSequences === undefined ? (
            <div className="p-6 border border-border/50 rounded-xl">
              <LoadingSkeleton width="w-full" height="h-32" />
            </div>
          ) : toolSequences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/50 rounded-xl bg-card">
              <p className="text-sm text-muted-foreground">
                No tool sequences detected yet (requires 2+ tools per session)
              </p>
            </div>
          ) : (
            <div className="border border-border/50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sequence
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Occurrences
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Success Rate
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Avg Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border/50">
                  {toolSequences.map((seq, idx) => (
                    <tr key={idx} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex flex-wrap gap-1">
                          {seq.tools.map((tool, i) => (
                            <span key={i} className="inline-flex items-center">
                              <span className="px-2 py-0.5 bg-secondary rounded text-xs">
                                {tool}
                              </span>
                              {i < seq.tools.length - 1 && (
                                <span className="mx-1 text-muted-foreground">→</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums">
                        {seq.occurrences.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right tabular-nums">
                        {seq.successRate != null
                          ? formatPercentage(seq.successRate)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-right tabular-nums">
                        {seq.avgDuration != null
                          ? `${Math.round(seq.avgDuration)}ms`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Time Patterns */}
        <Section title="Usage Patterns">
          {timePatterns === undefined ? (
            <div className="p-6 border border-border/50 rounded-xl">
              <LoadingSkeleton width="w-full" height="h-32" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Distribution */}
              <div className="p-6 border border-border/50 rounded-xl bg-card">
                <h3 className="font-semibold mb-4">Hourly Distribution (UTC)</h3>
                <div className="flex items-end gap-1 h-32">
                  {timePatterns.hourly.map((item) => {
                    const maxCount = Math.max(...timePatterns.hourly.map((h) => h.count), 1);
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div
                        key={item.hour}
                        className="flex-1 bg-foreground/20 rounded-t hover:bg-foreground/30 transition-colors relative group"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${item.hour}:00 - ${item.count.toLocaleString()} calls`}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-popover px-1 rounded whitespace-nowrap">
                          {item.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>0:00</span>
                  <span>6:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>
              </div>

              {/* Day of Week */}
              <div className="p-6 border border-border/50 rounded-xl bg-card">
                <h3 className="font-semibold mb-4">Day of Week</h3>
                <div className="space-y-3">
                  {timePatterns.dayOfWeek.map((item) => {
                    const maxCount = Math.max(...timePatterns.dayOfWeek.map((d) => d.count), 1);
                    return (
                      <div key={item.day} className="flex items-center gap-3">
                        <span className="w-8 text-sm text-muted-foreground">{item.dayName}</span>
                        <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground/30 rounded-full transition-all duration-300"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-sm tabular-nums">
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}
