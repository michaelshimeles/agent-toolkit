"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoadingTable, LoadingSkeleton } from "@/components/loading";

interface UsageClientProps {
  clerkId: string;
}

export default function UsageClient({ clerkId }: UsageClientProps) {
  // Get user from Convex
  const convexUser = useQuery(api.auth.getUserByClerkId, { clerkId });

  // Get usage stats
  const stats = useQuery(
    api.usage.getUserStats,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Get recent logs
  const logs = useQuery(
    api.usage.getUserLogs,
    convexUser ? { userId: convexUser._id, limit: 50 } : "skip"
  );

  return (
    <main className="min-h-screen px-6 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Usage Analytics</h1>
          <p className="text-base text-muted-foreground mt-2">
            Monitor your API usage and performance metrics
          </p>
        </div>

      {/* Stats Cards */}
      {stats === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 border border-border/50 rounded-xl animate-pulse">
              <LoadingSkeleton width="w-2/3" className="mb-2" />
              <LoadingSkeleton width="w-1/2" height="h-8" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <div className="p-6 border border-border/50 rounded-xl bg-card hover:shadow-md transition-all duration-200">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Total Requests
              </h3>
              <p className="text-3xl font-bold tracking-tight">
                {stats.totalRequests.toLocaleString()}
              </p>
            </div>

            <div className="p-6 border border-border/50 rounded-xl bg-card hover:shadow-md transition-all duration-200">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Successful
              </h3>
              <p className="text-3xl font-bold tracking-tight">
                {stats.successfulRequests.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalRequests > 0
                  ? `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>

            <div className="p-6 border border-border/50 rounded-xl bg-card hover:shadow-md transition-all duration-200">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Failed</h3>
              <p className="text-3xl font-bold tracking-tight">
                {stats.failedRequests.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalRequests > 0
                  ? `${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>

            <div className="p-6 border border-border/50 rounded-xl bg-card hover:shadow-md transition-all duration-200">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Avg Latency
              </h3>
              <p className="text-3xl font-bold tracking-tight">
                {stats.avgLatency}
                <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
              </p>
            </div>
          </div>

          {/* Usage by Integration */}
          {stats.byIntegration && Object.keys(stats.byIntegration).length > 0 && (
            <div className="mb-10 p-6 border border-border/50 rounded-xl bg-card">
              <h2 className="font-semibold text-lg mb-5 tracking-tight">Usage by Integration</h2>
              <div className="space-y-4">
                {Object.entries(stats.byIntegration)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([integration, count]) => {
                    const percentage =
                      (((count as number) / stats.totalRequests) * 100).toFixed(1);
                    return (
                      <div key={integration}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium capitalize">
                            {integration}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {String(count)} ({String(percentage)}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-foreground/30 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="mb-10">
            <h2 className="font-semibold text-lg mb-5 tracking-tight">Recent Activity</h2>
            {logs === undefined ? (
              <LoadingTable rows={10} />
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/50 rounded-2xl bg-card">
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet
                </p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Integration
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tool
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Latency
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border/50">
                    {logs.map((log: any, index: number) => (
                      <tr key={index} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {log.integrationName || log.integrationSlug || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {log.toolName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                              log.status === "success"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {log.latencyMs}ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(log._creationTime).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </main>
  );
}
