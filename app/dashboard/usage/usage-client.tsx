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
    <main className="min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor your API usage and performance metrics
          </p>
        </div>

      {/* Stats Cards */}
      {stats === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 border rounded-lg animate-pulse">
              <LoadingSkeleton width="w-2/3" className="mb-2" />
              <LoadingSkeleton width="w-1/2" height="h-8" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Total Requests
              </h3>
              <p className="text-3xl font-bold">
                {stats.totalRequests.toLocaleString()}
              </p>
            </div>

            <div className="p-6 border rounded-lg bg-green-500/10">
              <h3 className="text-sm font-medium text-green-500 mb-2">
                Successful
              </h3>
              <p className="text-3xl font-bold text-green-500">
                {stats.successfulRequests.toLocaleString()}
              </p>
              <p className="text-xs text-green-500/70 mt-1">
                {stats.totalRequests > 0
                  ? `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>

            <div className="p-6 border rounded-lg bg-destructive/10">
              <h3 className="text-sm font-medium text-destructive mb-2">Failed</h3>
              <p className="text-3xl font-bold text-destructive">
                {stats.failedRequests.toLocaleString()}
              </p>
              <p className="text-xs text-destructive/70 mt-1">
                {stats.totalRequests > 0
                  ? `${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%`
                  : "0%"}
              </p>
            </div>

            <div className="p-6 border rounded-lg bg-primary/10">
              <h3 className="text-sm font-medium text-primary mb-2">
                Avg Latency
              </h3>
              <p className="text-3xl font-bold text-primary">
                {stats.avgLatency}
                <span className="text-sm ml-1">ms</span>
              </p>
            </div>
          </div>

          {/* Usage by Integration */}
          {stats.byIntegration && Object.keys(stats.byIntegration).length > 0 && (
            <div className="mb-8 p-6 border rounded-lg bg-card">
              <h2 className="font-semibold text-lg mb-4">Usage by Integration</h2>
              <div className="space-y-3">
                {Object.entries(stats.byIntegration)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([integration, count]) => {
                    const percentage =
                      (((count as number) / stats.totalRequests) * 100).toFixed(1);
                    return (
                      <div key={integration}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">
                            {integration}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {String(count)} ({String(percentage)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
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
          <div className="mb-8">
            <h2 className="font-semibold text-lg mb-4">Recent Activity</h2>
            {logs === undefined ? (
              <LoadingTable rows={10} />
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Integration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tool
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Latency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {logs.map((log: any, index: number) => (
                      <tr key={index} className="hover:bg-accent">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {log.integrationName || log.integrationSlug || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {log.toolName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
