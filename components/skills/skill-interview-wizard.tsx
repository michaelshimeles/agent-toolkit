"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  InterviewState,
  InterviewAnswers,
  InterviewStep,
  createInitialState,
  canProceed,
  getStepIndex,
  getTotalSteps,
  getAllSteps,
  goToNextStep as nextStep,
  goToPreviousStep as prevStep,
  goToStep,
  updateAnswers,
  INTERVIEW_QUESTIONS,
} from "@/lib/skill-interview";
import { COMMON_MCPS, MCPSuggestion } from "@/components/skills/mcp-suggestions";

// localStorage key for persisting interview state
const STORAGE_KEY = "skill-interview-state";

interface SkillInterviewWizardProps {
  onComplete: (answers: InterviewAnswers) => void;
  onSwitchToChat: (partialAnswers: InterviewAnswers) => void;
}

// Step labels for display
const STEP_LABELS: Record<InterviewStep, string> = {
  problem: "Problem",
  workflow: "Workflow",
  mcps: "MCPs",
  examples: "Examples",
  review: "Review",
};

export default function SkillInterviewWizard({
  onComplete,
  onSwitchToChat,
}: SkillInterviewWizardProps) {
  // Initialize state from localStorage or create fresh state
  const [state, setState] = useState<InterviewState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved) as InterviewState;
        } catch {
          // Invalid saved state, start fresh
        }
      }
    }
    return createInitialState();
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Persist state to localStorage (with SSR safety check)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Get current step index and all steps
  const currentStepIndex = useMemo(
    () => getStepIndex(state.currentStep),
    [state.currentStep]
  );
  const allSteps = useMemo(() => getAllSteps(), []);
  const totalSteps = useMemo(() => getTotalSteps(), []);

  // Track completed steps
  const [completedSteps, setCompletedSteps] = useState<Set<InterviewStep>>(new Set());

  // Update completed steps when moving forward
  useEffect(() => {
    if (currentStepIndex > 0) {
      const newCompleted = new Set(completedSteps);
      for (let i = 0; i < currentStepIndex; i++) {
        newCompleted.add(allSteps[i]);
      }
      setCompletedSteps(newCompleted);
    }
  }, [currentStepIndex, allSteps, completedSteps]);

  // Update answers
  const handleUpdateAnswers = useCallback(
    (updates: Partial<InterviewAnswers>) => {
      setState((prev) => updateAnswers(prev, updates));
      setValidationErrors([]);
    },
    []
  );

  // Get validation errors for current step
  const getValidationErrors = useCallback(
    (step: InterviewStep): string[] => {
      const errors: string[] = [];
      const stepQuestions = INTERVIEW_QUESTIONS[step];

      for (const question of stepQuestions.questions) {
        if (!question.required) continue;

        const answerId = question.id as keyof InterviewAnswers;
        const answer = state.answers[answerId];

        if (answer === undefined || answer === null) {
          errors.push(`${question.question.replace("?", "")} is required`);
          continue;
        }

        if (typeof answer === "string" && answer.trim() === "") {
          errors.push(`${question.question.replace("?", "")} is required`);
          continue;
        }

        if (Array.isArray(answer) && answer.length === 0) {
          errors.push(`${question.question.replace("?", "")} is required`);
        }
      }

      return errors;
    },
    [state.answers]
  );

  // Navigate to next step
  const goToNextStep = useCallback(() => {
    if (!canProceed(state)) {
      const errors = getValidationErrors(state.currentStep);
      setValidationErrors(errors);
      return;
    }

    setIsTransitioning(true);
    setTimeout(() => {
      setState((prev) => {
        const newState = nextStep(prev);
        // Mark current step as completed
        setCompletedSteps((prevCompleted) => {
          const newCompleted = new Set(prevCompleted);
          newCompleted.add(prev.currentStep);
          return newCompleted;
        });
        return newState;
      });
      setValidationErrors([]);
      setIsTransitioning(false);
    }, 150);
  }, [state, getValidationErrors]);

  // Navigate to previous step
  const goToPreviousStep = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setState((prev) => prevStep(prev));
      setValidationErrors([]);
      setIsTransitioning(false);
    }, 150);
  }, []);

  // Jump to a specific step
  const jumpToStep = useCallback(
    (step: InterviewStep) => {
      const targetIndex = getStepIndex(step);
      // Can only jump to completed steps or current/previous
      if (targetIndex <= currentStepIndex || completedSteps.has(allSteps[targetIndex - 1])) {
        setIsTransitioning(true);
        setTimeout(() => {
          setState((prev) => goToStep(prev, step));
          setValidationErrors([]);
          setIsTransitioning(false);
        }, 150);
      }
    },
    [currentStepIndex, completedSteps, allSteps]
  );

  // Handle final submission
  const handleComplete = useCallback(() => {
    if (canProceed(state)) {
      // Clear localStorage on complete (with SSR safety check)
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
      onComplete(state.answers);
    }
  }, [state, onComplete]);

  // Handle switch to chat
  const handleSwitchToChat = useCallback(() => {
    onSwitchToChat(state.answers);
  }, [state.answers, onSwitchToChat]);

  // Check if current step is valid
  const isCurrentStepValid = useMemo(
    () => canProceed(state),
    [state]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Your Skill</h2>
          <span className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {allSteps.map((step, index) => {
            const isCompleted = completedSteps.has(step);
            const isCurrent = state.currentStep === step;
            const isAccessible =
              index <= currentStepIndex ||
              (index > 0 && completedSteps.has(allSteps[index - 1]));

            return (
              <div key={step} className="flex items-center flex-1">
                <button
                  onClick={() => isAccessible && jumpToStep(step)}
                  disabled={!isAccessible}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 w-full",
                    isCurrent && "bg-primary/10 text-primary",
                    isCompleted && !isCurrent && "text-muted-foreground hover:bg-muted",
                    !isCompleted && !isCurrent && "text-muted-foreground/50",
                    isAccessible && !isCurrent && "cursor-pointer hover:bg-muted/50",
                    !isAccessible && "cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all",
                      isCurrent && "bg-primary text-primary-foreground",
                      isCompleted && !isCurrent && "bg-green-500/20 text-green-600",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted && !isCurrent ? (
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
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">
                    {STEP_LABELS[step]}
                  </span>
                </button>
                {index < totalSteps - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1 mx-2 transition-colors",
                      isCompleted ? "bg-green-500/30" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div
          className={cn(
            "transition-opacity duration-150",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
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
                  className="text-destructive mt-0.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Please fix the following:
                  </p>
                  <ul className="mt-1 text-sm text-destructive/80 list-disc list-inside">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Problem Step */}
          {state.currentStep === "problem" && (
            <ProblemStep
              answers={state.answers}
              onUpdate={handleUpdateAnswers}
            />
          )}

          {/* Workflow Step */}
          {state.currentStep === "workflow" && (
            <WorkflowStep
              answers={state.answers}
              onUpdate={handleUpdateAnswers}
            />
          )}

          {/* MCPs Step */}
          {state.currentStep === "mcps" && (
            <MCPsStep
              answers={state.answers}
              onUpdate={handleUpdateAnswers}
            />
          )}

          {/* Examples Step */}
          {state.currentStep === "examples" && (
            <ExamplesStep
              answers={state.answers}
              onUpdate={handleUpdateAnswers}
            />
          )}

          {/* Review Step */}
          {state.currentStep === "review" && (
            <ReviewStep
              answers={state.answers}
              onEdit={jumpToStep}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
          >
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
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back
          </Button>

          <button
            onClick={handleSwitchToChat}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip to Chat Instead
          </button>

          {state.currentStep === "review" ? (
            <Button onClick={handleComplete} disabled={!isCurrentStepValid}>
              Create Skill
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
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </Button>
          ) : (
            <Button onClick={goToNextStep}>
              Next
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
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  answers: InterviewAnswers;
  onUpdate: (updates: Partial<InterviewAnswers>) => void;
}

/**
 * Problem Step - Define the problem and target users
 */
function ProblemStep({ answers, onUpdate }: StepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{INTERVIEW_QUESTIONS.problem.title}</CardTitle>
        <CardDescription>
          {INTERVIEW_QUESTIONS.problem.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Problem Statement <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Describe the problem your skill will solve. Be specific about the pain points it addresses..."
            value={answers.problemStatement || ""}
            onChange={(e) => onUpdate({ problemStatement: e.target.value })}
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            Example: &quot;Developers spend too much time writing boilerplate code for API
            endpoints, leading to inconsistent patterns and wasted effort.&quot;
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Target Users <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Who will use this skill? What is their context?"
            value={answers.targetUsers || ""}
            onChange={(e) => onUpdate({ targetUsers: e.target.value })}
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">
            Example: &quot;Backend developers working on Node.js/TypeScript projects who
            need to quickly scaffold REST APIs.&quot;
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Workflow Step - Define the steps the skill should follow
 */
function WorkflowStep({ answers, onUpdate }: StepProps) {
  const steps = answers.workflowSteps || [];

  const addStep = () => {
    onUpdate({ workflowSteps: [...steps, ""] });
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    onUpdate({ workflowSteps: newSteps });
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    onUpdate({ workflowSteps: newSteps });
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    onUpdate({ workflowSteps: newSteps });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{INTERVIEW_QUESTIONS.workflow.title}</CardTitle>
        <CardDescription>
          {INTERVIEW_QUESTIONS.workflow.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              No workflow steps yet. Add the steps your skill should follow.
            </p>
            <Button variant="outline" onClick={addStep}>
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
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add First Step
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg group"
            >
              {/* Drag handle and step number */}
              <div className="flex flex-col items-center gap-1 pt-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStep(index, "up")}
                    disabled={index === 0}
                    className={cn(
                      "p-1 rounded hover:bg-muted transition-colors",
                      index === 0 && "opacity-30 cursor-not-allowed"
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
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveStep(index, "down")}
                    disabled={index === steps.length - 1}
                    className={cn(
                      "p-1 rounded hover:bg-muted transition-colors",
                      index === steps.length - 1 && "opacity-30 cursor-not-allowed"
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
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {index + 1}
                </Badge>
              </div>

              {/* Step input */}
              <div className="flex-1">
                <Input
                  placeholder={`Step ${index + 1}: What should happen?`}
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                />
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeStep(index)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
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
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {steps.length > 0 && (
          <Button variant="outline" onClick={addStep} className="w-full">
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
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add Step
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Tip: Be specific about each step. Include what information is needed and
          what output is expected.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * MCPs Step - Select required MCP integrations
 */
function MCPsStep({ answers, onUpdate }: StepProps) {
  const selectedMCPs = answers.requiredMcps || [];

  const toggleMCP = (mcp: MCPSuggestion) => {
    const isSelected = selectedMCPs.includes(mcp.slug);
    if (isSelected) {
      onUpdate({
        requiredMcps: selectedMCPs.filter((slug) => slug !== mcp.slug),
      });
    } else {
      onUpdate({
        requiredMcps: [...selectedMCPs, mcp.slug],
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{INTERVIEW_QUESTIONS.mcps.title}</CardTitle>
        <CardDescription>
          {INTERVIEW_QUESTIONS.mcps.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMMON_MCPS.map((mcp) => {
            const isSelected = selectedMCPs.includes(mcp.slug);
            return (
              <button
                key={mcp.slug}
                onClick={() => toggleMCP(mcp)}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                  isSelected
                    ? "bg-primary/5 border-primary/30"
                    : "hover:bg-muted border-border hover:border-border/80"
                )}
              >
                {/* Checkbox indicator */}
                <div
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{mcp.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {mcp.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mcp.commonTools.slice(0, 3).map((tool) => (
                      <code
                        key={tool}
                        className="text-xs bg-muted px-1.5 py-0.5 rounded"
                      >
                        {tool}
                      </code>
                    ))}
                    {mcp.commonTools.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{mcp.commonTools.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedMCPs.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Selected MCPs ({selectedMCPs.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedMCPs.map((slug) => {
                const mcp = COMMON_MCPS.find((m) => m.slug === slug);
                return (
                  <Badge key={slug} variant="secondary">
                    {mcp?.name || slug}
                    <button
                      onClick={() => mcp && toggleMCP(mcp)}
                      className="ml-1 hover:text-destructive"
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
                        <path d="M18 6L6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Tip: Only select MCPs that your skill actually needs. You can always add
          more later.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Examples Step - Provide input/output examples
 */
function ExamplesStep({ answers, onUpdate }: StepProps) {
  const inputs = answers.exampleInputs || [];
  const outputs = answers.exampleOutputs || [];

  // Ensure we always have at least 2 example pairs
  const exampleCount = Math.max(2, Math.max(inputs.length, outputs.length));

  const updateInput = (index: number, value: string) => {
    const newInputs = [...inputs];
    while (newInputs.length <= index) newInputs.push("");
    newInputs[index] = value;
    onUpdate({ exampleInputs: newInputs });
  };

  const updateOutput = (index: number, value: string) => {
    const newOutputs = [...outputs];
    while (newOutputs.length <= index) newOutputs.push("");
    newOutputs[index] = value;
    onUpdate({ exampleOutputs: newOutputs });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{INTERVIEW_QUESTIONS.examples.title}</CardTitle>
        <CardDescription>
          {INTERVIEW_QUESTIONS.examples.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: exampleCount }).map((_, index) => (
          <div key={index} className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Example {index + 1}</Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Input {index === 0 && <span className="text-destructive">*</span>}
              </label>
              <Textarea
                placeholder="What would the user say or provide?"
                value={inputs[index] || ""}
                onChange={(e) => updateInput(index, e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
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
              >
                <path d="M12 5v14" />
                <path d="M19 12l-7 7-7-7" />
              </svg>
              <span className="text-xs">produces</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Expected Output{" "}
                {index === 0 && <span className="text-destructive">*</span>}
              </label>
              <Textarea
                placeholder="What should the skill produce or respond with?"
                value={outputs[index] || ""}
                onChange={(e) => updateOutput(index, e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          Tip: Good examples help the AI understand the expected behavior. Include
          edge cases if relevant.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Review Step - Summary of all answers with edit buttons
 */
function ReviewStep({
  answers,
  onEdit,
}: {
  answers: InterviewAnswers;
  onEdit: (step: InterviewStep) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Problem Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Problem & Users</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit("problem")}>
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
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Problem Statement
            </p>
            <p className="text-sm">{answers.problemStatement || "Not provided"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Target Users
            </p>
            <p className="text-sm">{answers.targetUsers || "Not provided"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Workflow Steps</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit("workflow")}>
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
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {answers.workflowSteps && answers.workflowSteps.length > 0 ? (
            <ol className="space-y-2">
              {answers.workflowSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {index + 1}
                  </Badge>
                  <span>{step || "Empty step"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No steps defined</p>
          )}
        </CardContent>
      </Card>

      {/* MCPs Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">MCP Integrations</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit("mcps")}>
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
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {answers.requiredMcps && answers.requiredMcps.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {answers.requiredMcps.map((slug) => {
                const mcp = COMMON_MCPS.find((m) => m.slug === slug);
                return (
                  <Badge key={slug} variant="secondary">
                    {mcp?.name || slug}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No MCPs selected</p>
          )}
        </CardContent>
      </Card>

      {/* Examples Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Examples</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit("examples")}>
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
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {answers.exampleInputs && answers.exampleInputs.length > 0 ? (
            answers.exampleInputs.map((input, index) => {
              const output = answers.exampleOutputs?.[index];
              if (!input && !output) return null;
              return (
                <div
                  key={index}
                  className="p-3 bg-muted/30 rounded-lg space-y-2"
                >
                  <Badge variant="outline" className="text-xs">
                    Example {index + 1}
                  </Badge>
                  {input && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Input
                      </p>
                      <p className="text-sm mt-0.5">{input}</p>
                    </div>
                  )}
                  {output && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Output
                      </p>
                      <p className="text-sm mt-0.5">{output}</p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No examples provided</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
