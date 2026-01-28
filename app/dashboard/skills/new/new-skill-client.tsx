"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import SkillCreatorChat from "./skill-creator-chat";
import { SkillArtifact } from "@/components/skills/skill-artifact-preview";
import SkillInterviewWizard from "@/components/skills/skill-interview-wizard";
import { InterviewAnswers } from "@/lib/skill-interview";

type CreationMode = "chat" | "guided";

interface NewSkillClientProps {
  clerkId: string;
}

export default function NewSkillClient({ clerkId }: NewSkillClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<CreationMode>("chat");
  const [interviewAnswers, setInterviewAnswers] = useState<InterviewAnswers | null>(null);
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Get Convex user
  const convexUser = useQuery(api.auth.getUserByClerkId, { clerkId });

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

  // Create skill mutation
  const createSkill = useMutation(api.skills.createSkill);

  // Handle saving the skill from the chat artifact
  const handleSaveSkill = useCallback(
    async (artifact: SkillArtifact) => {
      if (!convexUser) {
        throw new Error("User profile not found. Please refresh the page.");
      }

      if (!artifact.name || !artifact.description || !artifact.skillMd) {
        throw new Error(
          "Incomplete skill data. Please ensure the skill has a name, description, and content."
        );
      }

      setError(null);

      try {
        const skillId = await createSkill({
          userId: convexUser._id,
          name: artifact.name,
          description: artifact.description,
          files: {
            skillMd: artifact.skillMd,
            scripts: artifact.scripts || [],
            references: artifact.references || [],
          },
          metadata: {
            version: "1.0",
            license: "MIT",
          },
          // New fields from artifact
          summary: artifact.summary,
          tags: artifact.tags,
          category: artifact.category,
          workflow: artifact.workflow,
          examples: artifact.examples,
          mcpDependencies: artifact.mcpDependencies,
        });

        // Navigate to the skill editor page
        router.push(`/dashboard/skills/${skillId}`);
      } catch (err) {
        console.error("Failed to save skill:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to save skill. Please try again.";
        setError(errorMessage);
        throw err;
      }
    },
    [convexUser, createSkill, router]
  );

  // Handle interview completion - switch to chat mode with answers
  const handleInterviewComplete = useCallback((answers: InterviewAnswers) => {
    setInterviewAnswers(answers);
    setCreationMode("chat");
  }, []);

  // Handle switching from interview to chat with partial answers
  const handleSwitchToChat = useCallback((partialAnswers: InterviewAnswers) => {
    setInterviewAnswers(partialAnswers);
    setCreationMode("chat");
  }, []);

  return (
    <main className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/skills")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
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
              Back to Skills
            </button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-lg font-semibold">Create New Skill</h1>
              <p className="text-xs text-muted-foreground">
                {creationMode === "guided" ? "Answer questions to create your skill" : "Describe your skill and AI will help you create it"}
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setCreationMode("chat")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                creationMode === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Chat
            </button>
            <button
              onClick={() => setCreationMode("guided")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                creationMode === "guided"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Guided
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-destructive shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Failed to save skill
              </p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-destructive/60 hover:text-destructive"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-6 pt-6 pb-4 overflow-hidden">
        {convexUser === undefined ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-muted-foreground">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              <span>Loading...</span>
            </div>
          </div>
        ) : creationMode === "guided" ? (
          <div className="h-full overflow-auto">
            <SkillInterviewWizard
              onComplete={handleInterviewComplete}
              onSwitchToChat={handleSwitchToChat}
            />
          </div>
        ) : (
          <SkillCreatorChat
            clerkId={clerkId}
            onSave={handleSaveSkill}
            interviewAnswers={interviewAnswers}
          />
        )}
      </div>
    </main>
  );
}
