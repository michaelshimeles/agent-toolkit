"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface MCPSuggestion {
  name: string;
  slug: string;
  description: string;
  relevance: "high" | "medium" | "low";
  reason: string;
  commonTools: string[];
}

// Common MCP integrations that might be suggested
export const COMMON_MCPS: MCPSuggestion[] = [
  {
    name: "GitHub",
    slug: "github",
    description: "Repository access, PR creation, issue management",
    relevance: "high",
    reason: "For skills that interact with code repositories",
    commonTools: ["read_file", "create_pull_request", "list_issues", "create_issue"],
  },
  {
    name: "Linear",
    slug: "linear",
    description: "Issue tracking and project management",
    relevance: "medium",
    reason: "For skills that manage tasks and projects",
    commonTools: ["create_issue", "update_issue", "list_projects"],
  },
  {
    name: "Slack",
    slug: "slack",
    description: "Team notifications and channel messaging",
    relevance: "medium",
    reason: "For skills that need to notify teams",
    commonTools: ["send_message", "list_channels", "create_thread"],
  },
  {
    name: "PostgreSQL",
    slug: "postgres",
    description: "Database queries and data management",
    relevance: "medium",
    reason: "For skills that need database access",
    commonTools: ["query", "insert", "update", "delete"],
  },
  {
    name: "Filesystem",
    slug: "filesystem",
    description: "Local file operations",
    relevance: "high",
    reason: "For skills that read or write local files",
    commonTools: ["read_file", "write_file", "list_directory"],
  },
  {
    name: "Fetch",
    slug: "fetch",
    description: "HTTP requests to external APIs",
    relevance: "high",
    reason: "For skills that call external APIs",
    commonTools: ["get", "post", "put", "delete"],
  },
  {
    name: "Brave Search",
    slug: "brave-search",
    description: "Web search capabilities",
    relevance: "low",
    reason: "For skills that need to search the web",
    commonTools: ["search"],
  },
  {
    name: "Memory",
    slug: "memory",
    description: "Persistent memory across sessions",
    relevance: "low",
    reason: "For skills that need to remember context",
    commonTools: ["store", "retrieve", "list"],
  },
];

interface MCPSuggestionsProps {
  suggestions?: MCPSuggestion[];
  onSelect?: (mcp: MCPSuggestion) => void;
  selectedSlugs?: string[];
  compact?: boolean;
}

const relevanceColors = {
  high: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  low: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

export function MCPSuggestions({
  suggestions = COMMON_MCPS,
  onSelect,
  selectedSlugs = [],
  compact = false,
}: MCPSuggestionsProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Suggested MCPs
        </label>
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 5).map((mcp) => (
            <button
              key={mcp.slug}
              onClick={() => onSelect?.(mcp)}
              disabled={selectedSlugs.includes(mcp.slug)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all",
                selectedSlugs.includes(mcp.slug)
                  ? "bg-primary/10 border-primary/30 text-primary cursor-default"
                  : "hover:bg-muted border-border"
              )}
            >
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
              {mcp.name}
              {selectedSlugs.includes(mcp.slug) && (
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
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Available MCPs
        </label>
        <span className="text-xs text-muted-foreground">
          Click to add to skill
        </span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {suggestions.map((mcp) => {
          const isSelected = selectedSlugs.includes(mcp.slug);
          return (
            <button
              key={mcp.slug}
              onClick={() => onSelect?.(mcp)}
              disabled={isSelected}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                isSelected
                  ? "bg-primary/5 border-primary/30 cursor-default"
                  : "hover:bg-muted border-border hover:border-border/80"
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                  <span className="font-medium text-sm">{mcp.name}</span>
                  {isSelected && (
                    <Badge variant="outline" className="text-xs text-primary border-primary/30">
                      Added
                    </Badge>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs", relevanceColors[mcp.relevance])}
                >
                  {mcp.relevance}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {mcp.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {mcp.commonTools.slice(0, 4).map((tool) => (
                  <code
                    key={tool}
                    className="text-xs bg-muted px-1.5 py-0.5 rounded"
                  >
                    {tool}
                  </code>
                ))}
                {mcp.commonTools.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{mcp.commonTools.length - 4} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Analyze skill description to suggest relevant MCPs
 */
export function suggestMCPsForSkill(description: string): MCPSuggestion[] {
  const lowerDesc = description.toLowerCase();
  const suggestions: MCPSuggestion[] = [];

  // Keyword-based matching
  const keywords: Record<string, string[]> = {
    github: ["github", "repository", "repo", "pr", "pull request", "commit", "branch", "git"],
    linear: ["linear", "issue", "task", "project", "sprint", "ticket"],
    slack: ["slack", "notification", "notify", "message", "team", "channel"],
    postgres: ["database", "sql", "postgres", "postgresql", "query", "db"],
    filesystem: ["file", "directory", "folder", "read", "write", "local"],
    fetch: ["api", "http", "request", "rest", "endpoint", "webhook"],
    "brave-search": ["search", "web", "find", "lookup"],
    memory: ["remember", "memory", "persist", "store", "context"],
  };

  for (const [slug, words] of Object.entries(keywords)) {
    const matchCount = words.filter(word => lowerDesc.includes(word)).length;
    if (matchCount > 0) {
      const mcp = COMMON_MCPS.find(m => m.slug === slug);
      if (mcp) {
        // Adjust relevance based on match count
        const adjustedMcp = { ...mcp };
        if (matchCount >= 3) adjustedMcp.relevance = "high";
        else if (matchCount >= 2) adjustedMcp.relevance = "medium";
        suggestions.push(adjustedMcp);
      }
    }
  }

  // Sort by relevance
  const relevanceOrder = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => relevanceOrder[a.relevance] - relevanceOrder[b.relevance]);
}

export default MCPSuggestions;
