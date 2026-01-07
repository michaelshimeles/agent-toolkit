"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { useMutation } from "convex/react";

export function DeployedServers() {
  const { user, isLoaded } = useUser();
  
  // Get Convex user
  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Ensure user exists in Convex database
  const ensureUser = useMutation(api.auth.ensureUser);
  useEffect(() => {
    if (isLoaded && user && convexUser === null) {
      ensureUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [isLoaded, user, convexUser, ensureUser]);

  // Get user's generated servers
  const servers = useQuery(
    api.builder.listUserServers,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Filter to only deployed servers
  const deployedServers = servers?.filter((s: any) => s.status === "deployed") || [];

  if (!isLoaded || !user) {
    return null;
  }

  if (servers === undefined) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Deployed MCP Servers</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-full mb-3"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (deployedServers.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Deployed MCP Servers</h2>
          <Link
            href="/dashboard/builder"
            className="text-sm text-primary hover:text-primary/80"
          >
            Create New →
          </Link>
        </div>
        <div className="p-8 border border-dashed rounded-lg text-center">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-muted-foreground text-sm mb-3">
            No deployed servers yet
          </p>
          <Link
            href="/dashboard/builder"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Create your first MCP server →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Deployed MCP Servers ({deployedServers.length})
        </h2>
        <Link
          href="/dashboard/builder"
          className="text-sm text-primary hover:text-primary/80"
        >
          View All →
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deployedServers.slice(0, 6).map((server: any) => (
          <Link
            key={server._id}
            href={`/dashboard/builder/${server._id}`}
            className="group p-4 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                {server.name}
              </h3>
              <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full shrink-0 ml-2">
                Live
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {server.description}
            </p>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {server.tools?.length || 0} tools
              </span>
              {server.deploymentUrl && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(server.deploymentUrl, "_blank");
                  }}
                  className="text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1"
                >
                  Open
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {deployedServers.length > 6 && (
        <div className="mt-4 text-center">
          <Link
            href="/dashboard/builder"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View {deployedServers.length - 6} more servers →
          </Link>
        </div>
      )}
    </div>
  );
}

