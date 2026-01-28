"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/loading";
import { CodeEditor } from "@/components/code-editor";
import { calculateSkillTokens, getTokenCategory } from "@/lib/token-utils";

// MCP dependency type
export interface MCPDependency {
  mcpSlug: string;
  mcpName: string;
  description: string;
  requiredTools: string[];
  optional: boolean;
}

// Workflow step type
export interface WorkflowStep {
  title: string;
  description?: string;
  mcpTools?: string[];
}

// Example type
export interface SkillExample {
  title: string;
  input: string;
  output: string;
}

// Summary type with triggers
export interface SkillSummary {
  triggers?: string[];
}

// TypeScript interface for the skill artifact
export interface SkillArtifact {
  name?: string;
  description?: string;
  skillMd?: string;
  scripts?: Array<{ name: string; content: string; language: string }>;
  references?: Array<{ name: string; content: string }>;
  mcpDependencies?: MCPDependency[];
  // New fields
  category?: "workflow" | "template" | "integration" | string;
  tags?: string[];
  summary?: SkillSummary;
  workflow?: {
    steps?: WorkflowStep[];
  };
  examples?: SkillExample[];
}

// Generation step type for step indicators
type GenerationStep =
  | "understanding"
  | "structuring"
  | "generating"
  | "scripts"
  | "complete";

const GENERATION_STEPS: { id: GenerationStep; label: string }[] = [
  { id: "understanding", label: "Understanding requirements" },
  { id: "structuring", label: "Structuring skill" },
  { id: "generating", label: "Generating content" },
  { id: "scripts", label: "Creating scripts" },
  { id: "complete", label: "Complete" },
];

interface SkillArtifactPreviewProps {
  artifact: SkillArtifact;
  isStreaming: boolean;
  onSave: () => void;
  isSaving: boolean;
}

type TabId = "overview" | "skillmd" | "scripts" | "references" | "mcps";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
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
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 7h10" />
        <path d="M7 12h10" />
        <path d="M7 17h10" />
      </svg>
    ),
  },
  {
    id: "skillmd",
    label: "Skill.md",
    icon: (
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
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    id: "scripts",
    label: "Scripts",
    icon: (
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
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: "references",
    label: "References",
    icon: (
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
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    ),
  },
  {
    id: "mcps",
    label: "MCPs",
    icon: (
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
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

// Language badge colors
const languageColors: Record<string, string> = {
  python: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  javascript: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  typescript: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  bash: "bg-green-500/10 text-green-600 dark:text-green-400",
  shell: "bg-green-500/10 text-green-600 dark:text-green-400",
  default: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};


export function SkillArtifactPreview({
  artifact,
  isStreaming,
  onSave,
  isSaving,
}: SkillArtifactPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedScriptIndex, setSelectedScriptIndex] = useState(0);
  const [selectedReferenceIndex, setSelectedReferenceIndex] = useState(0);

  // Use a simple approach: show updating state when streaming
  // The visual update effect comes from the streaming state and CSS transitions
  const isContentUpdating = isStreaming;

  // Check if we have any content
  const hasContent =
    artifact.name ||
    artifact.description ||
    artifact.skillMd ||
    (artifact.scripts && artifact.scripts.length > 0) ||
    (artifact.references && artifact.references.length > 0);

  // Calculate tab counts for badges
  const scriptsCount = artifact.scripts?.length || 0;
  const referencesCount = artifact.references?.length || 0;
  const mcpsCount = artifact.mcpDependencies?.length || 0;

  // Calculate token count for display
  const tokenCount = useMemo(() => calculateSkillTokens(artifact), [artifact]);
  const tokenCategory = getTokenCategory(tokenCount);

  // Determine current generation step based on artifact content
  const currentStep = useMemo((): GenerationStep => {
    if (!hasContent) return "understanding";
    if (!artifact.name || !artifact.description) return "understanding";
    if (!artifact.skillMd) return "structuring";
    if (isStreaming && artifact.scripts && artifact.scripts.length > 0) return "scripts";
    if (isStreaming) return "generating";
    return "complete";
  }, [hasContent, artifact.name, artifact.description, artifact.skillMd, artifact.scripts, isStreaming]);

  return (
    <Card
      className={cn(
        "flex flex-col h-full transition-all duration-300",
        isContentUpdating && "ring-2 ring-primary/30 shadow-lg shadow-primary/10",
        isStreaming && "animate-pulse-subtle"
      )}
    >
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Skill Preview</CardTitle>
            {isStreaming && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Generating...
                </span>
              </div>
            )}
          </div>
          {hasContent && !isStreaming && (
            <Badge variant="secondary" className="text-xs">
              Ready to save
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Live preview of your skill as it&apos;s being created
        </CardDescription>
      </CardHeader>

      {/* Tabs */}
      <div className="px-5 border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "scripts" && scriptsCount > 0 && (
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {scriptsCount}
                </span>
              )}
              {tab.id === "references" && referencesCount > 0 && (
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {referencesCount}
                </span>
              )}
              {tab.id === "mcps" && mcpsCount > 0 && (
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {mcpsCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <CardContent className="flex-1 overflow-hidden pt-4 min-h-0 flex flex-col">
        {!hasContent && isStreaming ? (
          <div className="space-y-4">
            <LoadingSkeleton height="h-6" width="w-1/3" />
            <LoadingSkeleton height="h-4" width="w-2/3" />
            <LoadingSkeleton height="h-4" width="w-1/2" />
            <div className="pt-4">
              <LoadingSkeleton height="h-32" width="w-full" />
            </div>
          </div>
        ) : !hasContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground/30 mb-4"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
            <p className="text-sm text-muted-foreground">
              Start describing your skill to see a preview
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "transition-opacity duration-300 h-full",
              isContentUpdating && "opacity-90"
            )}
          >
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <OverviewTab
                artifact={artifact}
                isStreaming={isStreaming}
                tokenCount={tokenCount}
                tokenCategory={tokenCategory}
                currentStep={currentStep}
              />
            )}

            {/* Skill.md Tab */}
            {activeTab === "skillmd" && (
              <SkillMdTab artifact={artifact} isStreaming={isStreaming} />
            )}

            {/* Scripts Tab */}
            {activeTab === "scripts" && (
              <ScriptsTab
                artifact={artifact}
                isStreaming={isStreaming}
                selectedIndex={selectedScriptIndex}
                onSelectIndex={setSelectedScriptIndex}
              />
            )}

            {/* References Tab */}
            {activeTab === "references" && (
              <ReferencesTab
                artifact={artifact}
                isStreaming={isStreaming}
                selectedIndex={selectedReferenceIndex}
                onSelectIndex={setSelectedReferenceIndex}
              />
            )}

            {/* MCPs Tab */}
            {activeTab === "mcps" && (
              <MCPsTab
                artifact={artifact}
                isStreaming={isStreaming}
              />
            )}
          </div>
        )}
      </CardContent>

      {/* Footer with Save Button */}
      <div className="px-5 py-3 border-t mt-auto">
        <Button
          onClick={onSave}
          disabled={isSaving || isStreaming || !hasContent}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving Skill...
            </>
          ) : isStreaming ? (
            "Wait for generation to complete..."
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Skill
            </>
          )}
        </Button>
        {hasContent && !isStreaming && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            You can edit the skill after saving
          </p>
        )}
      </div>
    </Card>
  );
}

// Overview Tab Component
function OverviewTab({
  artifact,
  isStreaming,
  tokenCount,
  tokenCategory,
  currentStep,
}: {
  artifact: SkillArtifact;
  isStreaming: boolean;
  tokenCount: number;
  tokenCategory: "metadata" | "compact" | "full";
  currentStep: GenerationStep;
}) {
  return (
    <div className="space-y-6">
      {/* Generation Step Indicator - only show when streaming */}
      {isStreaming && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Generation Progress
          </label>
          <div className="flex items-center gap-2">
            {GENERATION_STEPS.map((step, index) => {
              const stepIndex = GENERATION_STEPS.findIndex(s => s.id === currentStep);
              const isActive = step.id === currentStep;
              const isComplete = index < stepIndex;
              const isPending = index > stepIndex;

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all",
                      isActive && "bg-primary text-primary-foreground animate-pulse",
                      isComplete && "bg-green-500 text-white",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isComplete ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < GENERATION_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-8 h-0.5 transition-all",
                        isComplete ? "bg-green-500" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {GENERATION_STEPS.find(s => s.id === currentStep)?.label}
          </p>
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Skill Name
        </label>
        {artifact.name ? (
          <div
            className={cn(
              "text-lg font-semibold transition-all duration-300",
              isStreaming && "animate-pulse-text"
            )}
          >
            {artifact.name}
          </div>
        ) : (
          <LoadingSkeleton height="h-7" width="w-1/2" />
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Description
        </label>
        {artifact.description ? (
          <p
            className={cn(
              "text-sm text-muted-foreground leading-relaxed transition-all duration-300",
              isStreaming && "animate-pulse-text"
            )}
          >
            {artifact.description}
          </p>
        ) : (
          <div className="space-y-2">
            <LoadingSkeleton height="h-4" width="w-full" />
            <LoadingSkeleton height="h-4" width="w-3/4" />
          </div>
        )}
      </div>

      {/* Category & Tags */}
      {(artifact.category || (artifact.tags && artifact.tags.length > 0)) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Category & Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {artifact.category && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  artifact.category === "workflow" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                  artifact.category === "template" && "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
                  artifact.category === "integration" && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                  !["workflow", "template", "integration"].includes(artifact.category) && "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                )}
              >
                {artifact.category}
              </Badge>
            )}
            {artifact.tags?.map((tag, i) => (
              <Badge
                key={tag}
                variant="secondary"
                className={cn(
                  "text-xs",
                  [
                    "bg-pink-500/10 text-pink-600 dark:text-pink-400",
                    "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                    "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  ][i % 5]
                )}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Triggers */}
      {artifact.summary?.triggers && artifact.summary.triggers.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Triggers
          </label>
          <div className="flex flex-wrap gap-1.5">
            {artifact.summary.triggers.map((trigger) => (
              <span
                key={trigger}
                className="text-xs px-2 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded border border-violet-500/20"
              >
                "{trigger}"
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Steps */}
      {artifact.workflow?.steps && artifact.workflow.steps.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Workflow Steps
          </label>
          <div className="space-y-2">
            {artifact.workflow.steps.map((step, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{step.title}</div>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                  {step.mcpTools && step.mcpTools.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {step.mcpTools.map((tool) => (
                        <code key={tool} className="text-xs px-1.5 py-0.5 bg-muted rounded">
                          {tool}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {artifact.examples && artifact.examples.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Examples
          </label>
          <div className="space-y-3">
            {artifact.examples.slice(0, 2).map((example, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                <div className="text-xs font-medium">{example.title}</div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Input:</div>
                  <pre className="text-xs bg-background/50 p-2 rounded overflow-auto max-h-20">
                    {example.input}
                  </pre>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Output:</div>
                  <pre className="text-xs bg-background/50 p-2 rounded overflow-auto max-h-20">
                    {example.output}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Count Display */}
      {tokenCount > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Token Estimate
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">~{tokenCount.toLocaleString()} tokens</span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                tokenCategory === "metadata" && "bg-green-500/10 text-green-600 dark:text-green-400",
                tokenCategory === "compact" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                tokenCategory === "full" && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              {tokenCategory}
            </Badge>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-2xl font-bold">
            {artifact.scripts?.length || 0}
          </div>
          <div className="text-xs text-muted-foreground">Scripts</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-2xl font-bold">
            {artifact.references?.length || 0}
          </div>
          <div className="text-xs text-muted-foreground">References</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-2xl font-bold">
            {artifact.mcpDependencies?.length || 0}
          </div>
          <div className="text-xs text-muted-foreground">MCPs</div>
        </div>
      </div>

      {/* File Structure Preview */}
      {(artifact.name ||
        artifact.scripts?.length ||
        artifact.references?.length) && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            File Structure
          </label>
          <pre className="text-xs bg-muted/50 p-4 rounded-lg border border-border/50 overflow-auto">
            {`${artifact.name || "skill-name"}/
├── SKILL.md
${
  artifact.scripts?.length
    ? `├── scripts/
${artifact.scripts.map((s, i) => `│   ${i === (artifact.scripts?.length ?? 0) - 1 ? "└" : "├"}── ${s.name}`).join("\n")}
`
    : ""
}${
              artifact.references?.length
                ? `└── references/
${artifact.references.map((r, i) => `    ${i === (artifact.references?.length ?? 0) - 1 ? "└" : "├"}── ${r.name}`).join("\n")}`
                : ""
            }`}
          </pre>
        </div>
      )}
    </div>
  );
}

// Skill.md Tab Component
function SkillMdTab({
  artifact,
  isStreaming,
}: {
  artifact: SkillArtifact;
  isStreaming: boolean;
}) {
  if (!artifact.skillMd) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton height="h-4" width="w-full" />
        <LoadingSkeleton height="h-4" width="w-5/6" />
        <LoadingSkeleton height="h-4" width="w-4/5" />
        <LoadingSkeleton height="h-4" width="w-full" />
        <LoadingSkeleton height="h-4" width="w-3/4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden border h-full flex flex-col",
        isStreaming && "ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b shrink-0">
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
            className="text-muted-foreground"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="text-sm font-medium">SKILL.md</span>
        </div>
        <Badge variant="outline" className="text-xs">
          markdown
        </Badge>
      </div>
      <div className="flex-1 overflow-auto min-h-0" style={{ height: "calc(100vh - 400px)", minHeight: "200px" }}>
        <CodeEditor
          value={artifact.skillMd}
          language="markdown"
          readOnly={true}
          height="100%"
        />
      </div>
      {isStreaming && (
        <div className="absolute bottom-2 right-2">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>
      )}
    </div>
  );
}

// Scripts Tab Component
function ScriptsTab({
  artifact,
  isStreaming,
  selectedIndex,
  onSelectIndex,
}: {
  artifact: SkillArtifact;
  isStreaming: boolean;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  const scripts = artifact.scripts || [];

  if (scripts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/30 mb-3"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <p className="text-sm text-muted-foreground">
          {isStreaming
            ? "Scripts will appear here as they're generated..."
            : "No scripts in this skill"}
        </p>
      </div>
    );
  }

  const selectedScript = scripts[selectedIndex] || scripts[0];

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Script Selector */}
      {scripts.length > 1 && (
        <div className="flex flex-wrap gap-2 shrink-0">
          {scripts.map((script, index) => (
            <button
              key={index}
              onClick={() => onSelectIndex(index)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all duration-200",
                selectedIndex === index
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted"
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
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              {script.name}
            </button>
          ))}
        </div>
      )}

      {/* Script Content */}
      <div
        className={cn(
          "relative rounded-lg overflow-hidden border flex-1 flex flex-col min-h-0",
          isStreaming && "ring-1 ring-primary/20"
        )}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b shrink-0">
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
              className="text-muted-foreground"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span className="text-sm font-medium">{selectedScript.name}</span>
          </div>
          <Badge
            className={cn(
              "text-xs",
              languageColors[selectedScript.language.toLowerCase()] ||
                languageColors.default
            )}
            variant="outline"
          >
            {selectedScript.language}
          </Badge>
        </div>
        <div className="flex-1 overflow-auto min-h-0" style={{ height: "calc(100vh - 420px)", minHeight: "200px" }}>
          <CodeEditor
            value={selectedScript.content}
            language={selectedScript.language}
            readOnly={true}
            height="100%"
          />
        </div>
        {isStreaming && (
          <div className="absolute bottom-2 right-2">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// References Tab Component
function ReferencesTab({
  artifact,
  isStreaming,
  selectedIndex,
  onSelectIndex,
}: {
  artifact: SkillArtifact;
  isStreaming: boolean;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  const references = artifact.references || [];

  if (references.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/30 mb-3"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
        <p className="text-sm text-muted-foreground">
          {isStreaming
            ? "References will appear here as they're generated..."
            : "No references in this skill"}
        </p>
      </div>
    );
  }

  const selectedReference = references[selectedIndex] || references[0];

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Reference Selector */}
      {references.length > 1 && (
        <div className="flex flex-wrap gap-2 shrink-0">
          {references.map((ref, index) => (
            <button
              key={index}
              onClick={() => onSelectIndex(index)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all duration-200",
                selectedIndex === index
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted"
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
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
              {ref.name}
            </button>
          ))}
        </div>
      )}

      {/* Reference Content */}
      <div
        className={cn(
          "relative rounded-lg overflow-hidden border flex-1 flex flex-col min-h-0",
          isStreaming && "ring-1 ring-primary/20"
        )}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b shrink-0">
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
              className="text-muted-foreground"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <span className="text-sm font-medium">{selectedReference.name}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            reference
          </Badge>
        </div>
        <div className="flex-1 overflow-auto min-h-0" style={{ height: "calc(100vh - 420px)", minHeight: "200px" }}>
          <CodeEditor
            value={selectedReference.content}
            language="markdown"
            readOnly={true}
            height="100%"
          />
        </div>
        {isStreaming && (
          <div className="absolute bottom-2 right-2">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// MCPs Tab Component
function MCPsTab({
  artifact,
  isStreaming,
}: {
  artifact: SkillArtifact;
  isStreaming: boolean;
}) {
  const mcpDependencies = artifact.mcpDependencies || [];

  if (mcpDependencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/30 mb-3"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <p className="text-sm text-muted-foreground">
          {isStreaming
            ? "MCP dependencies will appear here as they're detected..."
            : "No MCP dependencies for this skill"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MCPs enable skills to connect to external services
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This skill requires the following MCP integrations:
      </p>
      <div className="space-y-3">
        {mcpDependencies.map((mcp, index) => (
          <div
            key={index}
            className={cn(
              "p-4 rounded-lg border transition-all",
              mcp.optional
                ? "bg-muted/30 border-border/50"
                : "bg-primary/5 border-primary/20"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    mcp.optional ? "text-muted-foreground" : "text-primary"
                  )}
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
                <span className="font-medium">{mcp.mcpName}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    mcp.optional
                      ? "text-muted-foreground"
                      : "text-primary border-primary/30"
                  )}
                >
                  {mcp.optional ? "optional" : "required"}
                </Badge>
              </div>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {mcp.mcpSlug}
              </code>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {mcp.description}
            </p>
            {mcp.requiredTools.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Required Tools
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {mcp.requiredTools.map((tool, toolIndex) => (
                    <code
                      key={toolIndex}
                      className="text-xs bg-background px-2 py-1 rounded border"
                    >
                      {tool}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {isStreaming && (
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-xs text-muted-foreground">
            Detecting dependencies...
          </span>
        </div>
      )}
    </div>
  );
}

// Add custom animations to globals.css or inline styles
// These are defined as Tailwind classes that should exist in the project

export default SkillArtifactPreview;
