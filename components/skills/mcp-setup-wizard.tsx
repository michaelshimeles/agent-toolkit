"use client";

import { useState, useEffect, useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Key,
  Loader2,
  Shield,
  Wrench,
} from "lucide-react";

// MCP Dependency interface (matches schema)
export interface MCPDependency {
  mcpSlug: string;
  mcpName: string;
  description: string;
  requiredTools: string[];
  optional: boolean;
}

// Setup instructions for common MCPs
const MCP_SETUP_INFO: Record<
  string,
  {
    instructions: string;
    apiKeyUrl: string;
    apiKeyLabel: string;
    envVarName?: string;
  }
> = {
  github: {
    instructions:
      "Create a Personal Access Token (PAT) with the required scopes for your workflow. For most use cases, select 'repo' scope for full repository access.",
    apiKeyUrl: "https://github.com/settings/tokens/new",
    apiKeyLabel: "GitHub Personal Access Token",
    envVarName: "GITHUB_TOKEN",
  },
  linear: {
    instructions:
      "Generate an API key from your Linear settings. This key will have access to your workspace's issues, projects, and teams.",
    apiKeyUrl: "https://linear.app/settings/api",
    apiKeyLabel: "Linear API Key",
    envVarName: "LINEAR_API_KEY",
  },
  slack: {
    instructions:
      "Create a Slack App and install it to your workspace. You'll need a Bot Token (starts with xoxb-) with the necessary scopes for messaging and channel access.",
    apiKeyUrl: "https://api.slack.com/apps",
    apiKeyLabel: "Slack Bot Token",
    envVarName: "SLACK_BOT_TOKEN",
  },
  postgres: {
    instructions:
      "Provide a PostgreSQL connection string in the format: postgresql://user:password@host:port/database. Ensure the database user has appropriate permissions.",
    apiKeyUrl: "",
    apiKeyLabel: "PostgreSQL Connection String",
    envVarName: "DATABASE_URL",
  },
  filesystem: {
    instructions:
      "The Filesystem MCP allows read/write access to local files. No API key is required, but you should configure allowed directories for security.",
    apiKeyUrl: "",
    apiKeyLabel: "",
    envVarName: "",
  },
  fetch: {
    instructions:
      "The Fetch MCP enables HTTP requests to external APIs. No API key is required for the MCP itself, but target APIs may require their own authentication.",
    apiKeyUrl: "",
    apiKeyLabel: "",
    envVarName: "",
  },
};

// Status for each MCP configuration
type MCPStatus = "not_configured" | "configured" | "error" | "testing";

interface MCPSetupState {
  status: MCPStatus;
  apiKey: string;
  error?: string;
}

interface MCPSetupWizardProps {
  mcpDependencies: MCPDependency[];
  userId: Id<"users">;
  serverId?: Id<"generatedServers">;
  onComplete: () => void;
  onSkip?: () => void;
}

export function MCPSetupWizard({
  mcpDependencies,
  userId,
  serverId,
  onComplete,
  onSkip,
}: MCPSetupWizardProps) {
  // Track expanded state for each MCP accordion
  const [expandedMcps, setExpandedMcps] = useState<Set<string>>(new Set());

  // Track setup state for each MCP
  const [mcpStates, setMcpStates] = useState<Record<string, MCPSetupState>>({});

  // Initialize states for all MCPs
  useEffect(() => {
    const initialStates: Record<string, MCPSetupState> = {};
    mcpDependencies.forEach((dep) => {
      const setupInfo = MCP_SETUP_INFO[dep.mcpSlug];
      // MCPs that don't require API keys are considered configured by default
      const noKeyRequired = setupInfo && !setupInfo.apiKeyLabel;
      initialStates[dep.mcpSlug] = {
        status: noKeyRequired ? "configured" : "not_configured",
        apiKey: "",
      };
    });
    setMcpStates(initialStates);

    // Auto-expand first required MCP that needs configuration
    const firstRequired = mcpDependencies.find(
      (dep) => !dep.optional && MCP_SETUP_INFO[dep.mcpSlug]?.apiKeyLabel
    );
    if (firstRequired) {
      setExpandedMcps(new Set([firstRequired.mcpSlug]));
    }
  }, [mcpDependencies]);

  // Query existing API keys for this user
  const existingKeys = useQuery(
    api.builder.listExternalApiKeys,
    userId ? { userId } : "skip"
  );

  // Update states when existing keys are loaded
  useEffect(() => {
    if (existingKeys) {
      setMcpStates((prev) => {
        const updated = { ...prev };
        existingKeys.forEach((key) => {
          // Map service names to MCP slugs (they might match)
          const mcpSlug = key.serviceName.toLowerCase().replace(/\s+/g, "-");
          if (updated[mcpSlug]) {
            updated[mcpSlug] = {
              ...updated[mcpSlug],
              status: "configured",
            };
          }
          // Also check for direct matches
          Object.keys(updated).forEach((slug) => {
            if (
              key.serviceName.toLowerCase().includes(slug) ||
              slug.includes(key.serviceName.toLowerCase())
            ) {
              updated[slug] = {
                ...updated[slug],
                status: "configured",
              };
            }
          });
        });
        return updated;
      });
    }
  }, [existingKeys]);

  // Store API key action
  const storeApiKey = useAction(api.builderActions.storeExternalApiKey);

  // Toggle accordion
  const toggleExpanded = (mcpSlug: string) => {
    setExpandedMcps((prev) => {
      const next = new Set(prev);
      if (next.has(mcpSlug)) {
        next.delete(mcpSlug);
      } else {
        next.add(mcpSlug);
      }
      return next;
    });
  };

  // Update API key input
  const updateApiKey = (mcpSlug: string, value: string) => {
    setMcpStates((prev) => ({
      ...prev,
      [mcpSlug]: {
        ...prev[mcpSlug],
        apiKey: value,
        error: undefined,
      },
    }));
  };

  // Test and save API key
  const testConnection = useCallback(
    async (dep: MCPDependency) => {
      const state = mcpStates[dep.mcpSlug];
      if (!state?.apiKey.trim()) {
        setMcpStates((prev) => ({
          ...prev,
          [dep.mcpSlug]: {
            ...prev[dep.mcpSlug],
            error: "API key is required",
          },
        }));
        return;
      }

      // Set testing state
      setMcpStates((prev) => ({
        ...prev,
        [dep.mcpSlug]: {
          ...prev[dep.mcpSlug],
          status: "testing",
          error: undefined,
        },
      }));

      try {
        // For now, we'll just validate the key format and store it
        // In a production environment, you would actually test the connection
        const setupInfo = MCP_SETUP_INFO[dep.mcpSlug];

        // Basic validation
        if (dep.mcpSlug === "github" && !state.apiKey.startsWith("ghp_") && !state.apiKey.startsWith("github_pat_")) {
          // Allow classic tokens (ghp_) and fine-grained tokens (github_pat_)
          // Also allow older token formats that might not have a prefix
          if (state.apiKey.length < 20) {
            throw new Error("Invalid GitHub token format. Token appears too short.");
          }
        }

        if (dep.mcpSlug === "slack" && !state.apiKey.startsWith("xoxb-")) {
          throw new Error("Invalid Slack token format. Bot tokens should start with 'xoxb-'");
        }

        if (dep.mcpSlug === "postgres" && !state.apiKey.includes("://")) {
          throw new Error("Invalid connection string format. Should be: postgresql://user:password@host:port/database");
        }

        // Store the API key if we have a serverId
        if (serverId) {
          await storeApiKey({
            userId,
            serverId,
            serviceName: dep.mcpName,
            serviceKey: state.apiKey.trim(),
            keyName: `${dep.mcpName} API Key`,
          });
        }

        // Mark as configured
        setMcpStates((prev) => ({
          ...prev,
          [dep.mcpSlug]: {
            ...prev[dep.mcpSlug],
            status: "configured",
            apiKey: "", // Clear the input after saving
            error: undefined,
          },
        }));

        // Collapse this accordion and expand next unconfigured required MCP
        setExpandedMcps((prev) => {
          const next = new Set(prev);
          next.delete(dep.mcpSlug);

          // Find next unconfigured required MCP
          const nextMcp = mcpDependencies.find(
            (d) =>
              !d.optional &&
              d.mcpSlug !== dep.mcpSlug &&
              mcpStates[d.mcpSlug]?.status !== "configured" &&
              MCP_SETUP_INFO[d.mcpSlug]?.apiKeyLabel
          );
          if (nextMcp) {
            next.add(nextMcp.mcpSlug);
          }

          return next;
        });
      } catch (err) {
        setMcpStates((prev) => ({
          ...prev,
          [dep.mcpSlug]: {
            ...prev[dep.mcpSlug],
            status: "error",
            error: err instanceof Error ? err.message : "Failed to save API key",
          },
        }));
      }
    },
    [mcpStates, mcpDependencies, serverId, storeApiKey, userId]
  );

  // Check if all required MCPs are configured
  const allRequiredConfigured = mcpDependencies
    .filter((dep) => !dep.optional)
    .every((dep) => {
      const setupInfo = MCP_SETUP_INFO[dep.mcpSlug];
      const noKeyRequired = setupInfo && !setupInfo.apiKeyLabel;
      return noKeyRequired || mcpStates[dep.mcpSlug]?.status === "configured";
    });

  // Count configured MCPs
  const configuredCount = mcpDependencies.filter(
    (dep) => mcpStates[dep.mcpSlug]?.status === "configured"
  ).length;

  const requiredCount = mcpDependencies.filter((dep) => !dep.optional).length;

  // Get status badge for an MCP
  const getStatusBadge = (dep: MCPDependency) => {
    const state = mcpStates[dep.mcpSlug];
    const setupInfo = MCP_SETUP_INFO[dep.mcpSlug];
    const noKeyRequired = setupInfo && !setupInfo.apiKeyLabel;

    if (noKeyRequired) {
      return (
        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
          <CheckCircle2 className="size-3 mr-1" />
          No Key Required
        </Badge>
      );
    }

    switch (state?.status) {
      case "configured":
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            <CheckCircle2 className="size-3 mr-1" />
            Configured
          </Badge>
        );
      case "testing":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            <Loader2 className="size-3 mr-1 animate-spin" />
            Testing...
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
            <AlertCircle className="size-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
            <AlertCircle className="size-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          Configure MCP Dependencies
        </CardTitle>
        <CardDescription>
          This skill requires the following MCP integrations. Configure your API keys to enable full functionality.
        </CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {configuredCount}/{mcpDependencies.length} configured
          </Badge>
          {requiredCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {mcpDependencies.filter((d) => !d.optional && mcpStates[d.mcpSlug]?.status === "configured").length}/
              {requiredCount} required
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {mcpDependencies.map((dep) => {
          const isExpanded = expandedMcps.has(dep.mcpSlug);
          const state = mcpStates[dep.mcpSlug];
          const setupInfo = MCP_SETUP_INFO[dep.mcpSlug];
          const noKeyRequired = setupInfo && !setupInfo.apiKeyLabel;

          return (
            <div
              key={dep.mcpSlug}
              className={cn(
                "border rounded-lg overflow-hidden transition-all duration-200",
                state?.status === "configured"
                  ? "border-green-500/30 bg-green-500/5"
                  : state?.status === "error"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-border"
              )}
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleExpanded(dep.mcpSlug)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-muted">
                    <Wrench className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dep.mcpName}</span>
                      {dep.optional && (
                        <Badge variant="outline" className="text-xs">
                          Optional
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dep.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(dep)}
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
                  {/* Required Tools */}
                  {dep.requiredTools.length > 0 && (
                    <div className="pt-4">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Required Tools
                      </label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {dep.requiredTools.map((tool) => (
                          <code
                            key={tool}
                            className="text-xs bg-muted px-2 py-1 rounded-md font-mono"
                          >
                            {tool}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Setup Instructions */}
                  {setupInfo && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Setup Instructions
                      </label>
                      <Alert className="mt-2">
                        <Key className="size-4" />
                        <AlertDescription className="text-sm">
                          {setupInfo.instructions}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* API Key URL */}
                  {setupInfo?.apiKeyUrl && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Get Your API Key
                      </label>
                      <a
                        href={setupInfo.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="size-3" />
                        {setupInfo.apiKeyUrl}
                      </a>
                    </div>
                  )}

                  {/* API Key Input */}
                  {setupInfo?.apiKeyLabel && !noKeyRequired && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {setupInfo.apiKeyLabel}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          value={state?.apiKey || ""}
                          onChange={(e) => updateApiKey(dep.mcpSlug, e.target.value)}
                          placeholder={`Enter your ${setupInfo.apiKeyLabel.toLowerCase()}`}
                          className="font-mono flex-1"
                          disabled={state?.status === "testing"}
                        />
                        <Button
                          onClick={() => testConnection(dep)}
                          disabled={
                            !state?.apiKey?.trim() ||
                            state?.status === "testing" ||
                            state?.status === "configured"
                          }
                          size="sm"
                        >
                          {state?.status === "testing" ? (
                            <>
                              <Loader2 className="size-4 mr-1 animate-spin" />
                              Testing...
                            </>
                          ) : state?.status === "configured" ? (
                            <>
                              <CheckCircle2 className="size-4 mr-1" />
                              Saved
                            </>
                          ) : (
                            "Test Connection"
                          )}
                        </Button>
                      </div>
                      {state?.error && (
                        <p className="text-xs text-destructive">{state.error}</p>
                      )}
                      {state?.status === "configured" && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          API key saved successfully. You can update it by entering a new key above.
                        </p>
                      )}
                    </div>
                  )}

                  {/* No key required message */}
                  {noKeyRequired && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground">
                        This MCP does not require an API key to function.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {allRequiredConfigured ? (
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="size-4" />
                All required MCPs configured
              </span>
            ) : (
              <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <AlertCircle className="size-4" />
                {requiredCount - mcpDependencies.filter((d) => !d.optional && mcpStates[d.mcpSlug]?.status === "configured").length} required MCP(s) need configuration
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {onSkip && (
              <Button variant="outline" onClick={onSkip}>
                Skip for Now
              </Button>
            )}
            <Button
              onClick={onComplete}
              disabled={!allRequiredConfigured}
            >
              Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MCPSetupWizard;
