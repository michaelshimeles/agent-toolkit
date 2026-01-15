"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SKILL_TEMPLATES } from "@/lib/skills/templates";

interface NewSkillClientProps {
  clerkId: string;
}

export default function NewSkillClient({ clerkId }: NewSkillClientProps) {
  const searchParams = useSearchParams();
  const templateParam = searchParams.get("template");

  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateParam);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState("");
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

  // Generate skill action
  const generateSkill = useAction(api.skillGeneration.generateSkill);

  // Pre-fill description from template param
  useEffect(() => {
    if (templateParam && !description) {
      const template = SKILL_TEMPLATES.find((t) => t.id === templateParam);
      if (template) {
        setDescription(
          `Create a ${template.name.toLowerCase()} skill that ${template.description.toLowerCase()}`
        );
      }
    }
  }, [templateParam, description]);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please describe the skill you want to create.");
      return;
    }

    if (!convexUser) {
      setError("User profile not found. Please refresh the page.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Get template data if a template is selected
    const template = selectedTemplate
      ? SKILL_TEMPLATES.find((t) => t.id === selectedTemplate)
      : null;

    setGenerationStatus(
      template
        ? "Creating skill from template..."
        : "Generating your skill with AI..."
    );

    try {
      const result = await generateSkill({
        userId: convexUser._id,
        description: description.trim(),
        templateId: selectedTemplate || undefined,
        templateData: template
          ? {
              skillMd: template.skillMd,
              scripts: template.scripts,
              references: template.references,
            }
          : undefined,
      });

      setGenerationStatus("Skill created successfully!");

      // Navigate to the skill editor
      router.push(`/dashboard/skills/${result.skillId}`);
    } catch (err) {
      console.error("Failed to generate skill:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate skill. Please try again."
      );
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = SKILL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      // Pre-fill with template description as starting point
      setDescription(
        `Create a ${template.name.toLowerCase()} skill that ${template.description.toLowerCase()}`
      );
    }
  };

  return (
    <main className="flex flex-col h-screen p-12">
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard/skills")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
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
        <h1 className="text-2xl font-bold">Create New Skill</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Describe your skill in natural language and AI will generate it for
          you
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Describe Your Skill
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Tell us what you want your skill to do. Be specific about the
              tasks, behaviors, and any scripts or tools it should include.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Create a skill that helps review Python code for security vulnerabilities. It should check for SQL injection, XSS, hardcoded secrets, and insecure dependencies. Include a Python script that can scan files and generate a report."
              className="w-full h-48 px-4 py-3 border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isGenerating}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground">
                {description.length}/2000 characters
              </div>
              <button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  !description.trim() ||
                  convexUser === undefined
                }
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                )}
                {isGenerating
                  ? "Generating..."
                  : convexUser === undefined
                    ? "Loading..."
                    : "Generate Skill"}
              </button>
            </div>

            {isGenerating && generationStatus && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <svg
                    className="animate-pulse h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  {generationStatus}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="border rounded-lg p-6 bg-muted/30">
            <h3 className="font-medium mb-3">Tips for better skills</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
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
                  className="text-primary mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Be specific about what tasks the skill should help with
              </li>
              <li className="flex items-start gap-2">
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
                  className="text-primary mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Mention if you need scripts (Python, Bash, JavaScript)
              </li>
              <li className="flex items-start gap-2">
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
                  className="text-primary mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Include example scenarios or use cases
              </li>
              <li className="flex items-start gap-2">
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
                  className="text-primary mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Specify any output formats or preferences
              </li>
            </ul>
          </div>
        </div>

        {/* Templates Sidebar */}
        <div className="space-y-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Start from Template</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose a template as a starting point
            </p>
            <div className="space-y-2">
              {SKILL_TEMPLATES.slice(0, 6).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  disabled={isGenerating}
                  className={`w-full p-3 text-left border rounded-lg transition-colors ${
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => router.push("/dashboard/skills/templates")}
              className="w-full mt-4 text-sm text-primary hover:underline"
            >
              View all templates
            </button>
          </div>

          {/* Selected template info */}
          {selectedTemplate && (
            <div className="border rounded-lg p-4 bg-primary/5 border-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Selected Template</span>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <div className="text-sm">
                {SKILL_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
