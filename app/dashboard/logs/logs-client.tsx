"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoadingTable } from "@/components/loading";

interface LogsClientProps {
  clerkId: string;
}

export default function LogsClient({ clerkId }: LogsClientProps) {
  const [limit, setLimit] = useState(50);

  // Get Convex user
  const convexUser = useQuery(api.auth.getUserByClerkId, { clerkId });

  // Get activity logs
  const logs = useQuery(
    api.usage.getUserLogs,
    convexUser ? { userId: convexUser._id, limit } : "skip"
  );

  return (
    <main className="flex flex-col h-screen p-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Recent tool calls across all integrations
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label htmlFor="limit" className="text-sm font-medium mr-2">
            Show:
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-input bg-background rounded px-3 py-1 text-sm"
          >
            <option value={25}>Last 25</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {logs === undefined ? (
        <LoadingTable rows={10} />
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No activity logs yet. Start using integrations to see logs here.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
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
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {logs.map((log: any) => (
                <tr key={log._id} className="hover:bg-accent">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(log._creationTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.integrationName}</span>
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {log.integrationSlug}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground">
                    {log.toolName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.status === "success" ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-medium">
                        Success
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-destructive/10 text-destructive rounded text-xs font-medium">
                        Error
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {log.latencyMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {logs && logs.length > 0 && (
        <div className="mt-6 text-sm text-muted-foreground">
          Showing {logs.length} most recent {logs.length === 1 ? "log" : "logs"}
        </div>
      )}
    </main>
  );
}
