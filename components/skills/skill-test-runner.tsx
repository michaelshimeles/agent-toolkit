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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface SkillTestRunnerProps {
  skillId: string;
  skillName: string;
  skillDescription: string;
}

interface TestResult {
  id: string;
  prompt: string;
  response: string;
  status: "success" | "error";
  timestamp: Date;
  metrics: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  };
  error?: string;
}

// Generate suggested prompts based on skill description
function generateSuggestedPrompts(description: string): string[] {
  const lowerDesc = description.toLowerCase();
  const prompts: string[] = [];

  // Extract key action words and concepts from description
  const actionWords = ["create", "generate", "build", "analyze", "convert", "format", "write", "help", "assist"];
  const foundActions = actionWords.filter(action => lowerDesc.includes(action));

  // Common prompt patterns based on skill type
  if (lowerDesc.includes("code") || lowerDesc.includes("programming") || lowerDesc.includes("developer")) {
    prompts.push("Write a simple example demonstrating the main functionality");
    prompts.push("What are the best practices for using this skill?");
  }

  if (lowerDesc.includes("document") || lowerDesc.includes("writing") || lowerDesc.includes("text")) {
    prompts.push("Help me draft a short document about a topic of my choice");
    prompts.push("What formatting options are available?");
  }

  if (lowerDesc.includes("data") || lowerDesc.includes("analysis") || lowerDesc.includes("analyze")) {
    prompts.push("Analyze this sample data and provide insights");
    prompts.push("What types of analysis can you perform?");
  }

  // Generic prompts that work for most skills
  prompts.push(`Explain what ${description.split(" ").slice(0, 5).join(" ")}... can do`);
  prompts.push("Show me an example of how to use this skill effectively");
  prompts.push("What are the key features and capabilities?");
  prompts.push("Help me get started with a basic task");

  // Return unique prompts, limited to 4
  return [...new Set(prompts)].slice(0, 4);
}

export function SkillTestRunner({
  skillId,
  skillName,
  skillDescription,
}: SkillTestRunnerProps) {
  const [testPrompt, setTestPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  // Generate suggested prompts based on skill description
  const suggestedPrompts = useMemo(
    () => generateSuggestedPrompts(skillDescription),
    [skillDescription]
  );

  const handleRunTest = async () => {
    if (!testPrompt.trim()) {
      toast.error("Please enter a test prompt");
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch("/api/skill-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skillId,
          testPrompt: testPrompt.trim(),
        }),
      });

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(data.error || "Failed to run test");
      }

      const result: TestResult = {
        id: crypto.randomUUID(),
        prompt: testPrompt.trim(),
        response: data.response || "",
        status: "success",
        timestamp: new Date(),
        metrics: {
          inputTokens: data.inputTokens || 0,
          outputTokens: data.outputTokens || 0,
          latencyMs: data.latencyMs || latencyMs,
        },
      };

      setCurrentResult(result);
      setTestHistory((prev) => [result, ...prev].slice(0, 5));
      toast.success("Test completed successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";

      const result: TestResult = {
        id: crypto.randomUUID(),
        prompt: testPrompt.trim(),
        response: "",
        status: "error",
        timestamp: new Date(),
        metrics: {
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
        },
        error: errorMessage,
      };

      setCurrentResult(result);
      setTestHistory((prev) => [result, ...prev].slice(0, 5));
      toast.error("Test failed", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (result: TestResult) => {
    setCurrentResult(result);
  };

  const handleSuggestedPromptClick = (prompt: string) => {
    setTestPrompt(prompt);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Test Runner</CardTitle>
            {isLoading && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs text-muted-foreground">Running...</span>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {skillName}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Test your skill with sample inputs and see the results
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
        {/* Test Input Area */}
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Test Prompt
            </label>
            <Textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a test prompt to run against your skill..."
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleRunTest}
            disabled={isLoading || !testPrompt.trim()}
            className="w-full"
          >
            {isLoading ? (
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
                Running Test...
              </>
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
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run Test
              </>
            )}
          </Button>
        </div>

        {/* Suggested Prompts */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Suggested Prompts
          </label>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPromptClick(prompt)}
                disabled={isLoading}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border transition-all duration-200",
                  "bg-muted/50 hover:bg-muted border-border/50 hover:border-border",
                  "text-left truncate max-w-full",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {truncateText(prompt, 50)}
              </button>
            ))}
          </div>
        </div>

        {/* Results Display */}
        {currentResult && (
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Result
              </label>
              <div className="flex items-center gap-2">
                <Badge
                  variant={currentResult.status === "success" ? "secondary" : "destructive"}
                  className={cn(
                    "text-xs",
                    currentResult.status === "success"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}
                >
                  {currentResult.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(currentResult.timestamp)}
                </span>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="flex items-center gap-4 p-2 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-1.5">
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
                  className="text-muted-foreground"
                >
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
                <span className="text-xs">
                  <span className="text-muted-foreground">In:</span>{" "}
                  <span className="font-medium">{currentResult.metrics.inputTokens.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
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
                  className="text-muted-foreground"
                >
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
                <span className="text-xs">
                  <span className="text-muted-foreground">Out:</span>{" "}
                  <span className="font-medium">{currentResult.metrics.outputTokens.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
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
                  className="text-muted-foreground"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-xs">
                  <span className="text-muted-foreground">Latency:</span>{" "}
                  <span className="font-medium">{currentResult.metrics.latencyMs.toLocaleString()}ms</span>
                </span>
              </div>
            </div>

            {/* Response Panel */}
            <div
              className={cn(
                "flex-1 min-h-0 rounded-lg border overflow-hidden flex flex-col",
                currentResult.status === "error"
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-border/50 bg-muted/20"
              )}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30 shrink-0">
                <span className="text-xs font-medium">Response</span>
                {currentResult.response && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentResult.response);
                      toast.success("Copied to clipboard");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto p-3" style={{ maxHeight: "200px" }}>
                {currentResult.status === "error" ? (
                  <p className="text-sm text-red-500">{currentResult.error}</p>
                ) : currentResult.response ? (
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {currentResult.response}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No response</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test History */}
        {testHistory.length > 0 && (
          <div className="space-y-2 shrink-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent Tests ({testHistory.length})
            </label>
            <div className="space-y-1.5 max-h-[150px] overflow-auto">
              {testHistory.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectHistoryItem(result)}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg border transition-all duration-200 text-left",
                    currentResult?.id === result.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 hover:bg-muted/50 hover:border-border"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        result.status === "success" ? "bg-green-500" : "bg-red-500"
                      )}
                    />
                    <span className="text-xs truncate">{truncateText(result.prompt, 40)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatTimestamp(result.timestamp)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!currentResult && testHistory.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
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
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <p className="text-sm text-muted-foreground">
              Enter a prompt and click "Run Test" to test your skill
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Or click a suggested prompt to get started
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SkillTestRunner;
