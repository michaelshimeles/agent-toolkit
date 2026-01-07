"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoadingCard } from "@/components/loading";

interface IntegrationsClientProps {
  clerkId: string;
  email: string;
  name?: string;
  imageUrl?: string;
}

export default function IntegrationsClient({
  clerkId,
  email,
  name,
  imageUrl,
}: IntegrationsClientProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Ensure user exists in Convex
  const ensureUser = useMutation(api.auth.ensureUser);

  // Get Convex user
  const convexUser = useQuery(api.auth.getUserByClerkId, { clerkId });

  // Create user in Convex if they don't exist
  useEffect(() => {
    if (convexUser === null) {
      ensureUser({ clerkId, email, name, imageUrl });
    }
  }, [convexUser, ensureUser, clerkId, email, name, imageUrl]);

  // Get all available integrations
  const integrations = useQuery(api.integrations.listActive);

  // Get user's enabled integrations (only when convexUser exists)
  const userIntegrations = useQuery(
    api.integrations.listUserIntegrations,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Mutations for toggling integrations
  const enableIntegration = useMutation(api.integrations.enableIntegration);
  const disableIntegration = useMutation(api.integrations.disableIntegration);

  const handleToggle = async (
    integrationId: string,
    isEnabled: boolean,
    integrationSlug: string
  ) => {
    if (!convexUser) return;

    setTogglingId(integrationId);
    try {
      if (isEnabled) {
        await disableIntegration({
          userId: convexUser._id,
          integrationId: integrationId as any,
        });
      } else {
        // Redirect to OAuth flow for supported integrations
        if (["github", "linear", "notion", "slack"].includes(integrationSlug)) {
          window.location.href = `/api/oauth/${integrationSlug}/authorize`;
          return;
        }

        // For integrations without OAuth, just enable
        await enableIntegration({
          userId: convexUser._id,
          integrationId: integrationId as any,
        });
      }
    } catch (error) {
      console.error("Failed to toggle integration:", error);
      alert("Failed to toggle integration. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <main className="flex flex-col h-screen p-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Connect your favorite tools and services to Claude
        </p>
      </div>

      {integrations === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : integrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No integrations available yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration: any) => {
            const isEnabled = userIntegrations?.some(
              (ui: any) => ui?._id === integration._id
            );

            return (
              <div
                key={integration._id}
                className="flex flex-col p-6 border rounded-lg bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {integration.iconUrl && (
                      <img
                        src={integration.iconUrl}
                        alt={integration.name}
                        className="w-10 h-10 rounded"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {integration.name}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {integration.category}
                      </span>
                    </div>
                  </div>
                  {integration.status === "beta" && (
                    <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded">
                      Beta
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-grow">
                  {integration.description}
                </p>

                <div className="mb-4">
                  <p className="text-xs font-medium mb-2">
                    {integration.tools.length} tools available
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {integration.tools.slice(0, 3).map((tool: any) => (
                      <span
                        key={tool.name}
                        className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
                      >
                        {tool.name}
                      </span>
                    ))}
                    {integration.tools.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                        +{integration.tools.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleToggle(
                      integration._id,
                      isEnabled || false,
                      integration.slug
                    )
                  }
                  disabled={togglingId === integration._id}
                  className={`w-full py-2 px-4 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isEnabled
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {togglingId === integration._id
                    ? "..."
                    : isEnabled
                      ? "Disconnect"
                      : "Connect"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
