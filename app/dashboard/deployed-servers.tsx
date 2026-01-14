"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { useMutation } from "convex/react";

export function DeployedServers() {
  const { user, isLoaded } = useUser();

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

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

  const servers = useQuery(
    api.builder.listUserServers,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const deployedServers = servers?.filter((s: any) => s.status === "deployed") || [];

  if (!isLoaded || !user) {
    return null;
  }

  if (servers === undefined) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">MCP Servers</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (deployedServers.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">MCP Servers</h2>
          <Link
            href="/dashboard/builder"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Create
          </Link>
        </div>
        <div className="p-6 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No deployed servers yet.{" "}
            <Link href="/dashboard/builder" className="text-foreground hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">
          MCP Servers
          <span className="ml-2 text-muted-foreground font-normal">
            {deployedServers.length}
          </span>
        </h2>
        <Link
          href="/dashboard/builder"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {deployedServers.slice(0, 6).map((server: any) => (
          <Link
            key={server._id}
            href={`/dashboard/builder/${server._id}`}
            className="group p-4 border rounded-lg hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-sm font-medium line-clamp-1">
                {server.name}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded shrink-0 ml-2">
                Live
              </span>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {server.description}
            </p>

            <div className="text-xs text-muted-foreground">
              {server.tools?.length || 0} tools
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
