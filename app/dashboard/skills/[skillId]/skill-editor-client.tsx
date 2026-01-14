"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { validateSkill, parseFrontmatter } from "@/lib/skills/validator";
import { CodeEditor } from "@/components/code-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SkillEditorClientProps {
  clerkId: string;
  skillId: string;
}

type PreviewMode = "simulated" | "files";
type SelectedFile = "SKILL.md" | { type: "script" | "reference" | "asset"; index: number };

export default function SkillEditorClient({
  clerkId,
  skillId,
}: SkillEditorClientProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("simulated");
  const [selectedFile, setSelectedFile] = useState<SelectedFile>("SKILL.md");
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployMode, setDeployMode] = useState<"new" | "existing">("new");
  const [repoVisibility, setRepoVisibility] = useState<"public" | "private">("public");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Local state for editing
  const [editedSkillMd, setEditedSkillMd] = useState<string | null>(null);

  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Get Convex user
  const convexUser = useQuery(api.auth.getUserByClerkId, { clerkId });

  // Ensure user exists
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

  // Get skill data
  const skill = useQuery(api.skills.getSkill, {
    skillId: skillId as Id<"skills">,
  });

  // Get version history
  const versions = useQuery(api.skills.getVersionHistory, {
    skillId: skillId as Id<"skills">,
  });

  // Mutations and actions
  const updateSkill = useMutation(api.skills.updateSkill);
  const refineSkill = useAction(api.skillGeneration.refineSkill);
  const deployToNewRepo = useAction(api.skillDeploy.deployToNewRepo);

  // Initialize edited content when skill loads
  useEffect(() => {
    if (skill && editedSkillMd === null) {
      setEditedSkillMd(skill.files.skillMd);
    }
  }, [skill, editedSkillMd]);

  const handleSave = async () => {
    if (!skill || !editedSkillMd) return;

    setIsSaving(true);
    try {
      await updateSkill({
        skillId: skill._id,
        files: {
          ...skill.files,
          skillMd: editedSkillMd,
        },
        changeDescription: "Manual edit",
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefine = async () => {
    if (!chatInput.trim() || !skill) return;

    setIsRefining(true);
    try {
      await refineSkill({
        skillId: skill._id,
        feedback: chatInput.trim(),
      });
      setChatInput("");
      setEditedSkillMd(null); // Reset to trigger reload
    } catch (err) {
      console.error("Failed to refine:", err);
    } finally {
      setIsRefining(false);
    }
  };

  const handleDeploy = async () => {
    if (!skill) return;
    setDeployError(null);
    setShowDeployDialog(true);
  };

  const handleDeploySubmit = async () => {
    if (!skill || !githubToken.trim()) {
      setDeployError("GitHub token is required");
      return;
    }

    setIsDeploying(true);
    setDeployError(null);

    try {
      const result = await deployToNewRepo({
        skillId: skill._id,
        repoName: skill.name,
        isPrivate: repoVisibility === "private",
        githubToken: githubToken.trim(),
      });

      if (result.success && result.repoUrl) {
        setShowDeployDialog(false);
        setGithubToken(""); // Clear token after successful deploy
        // Open the repo in a new tab
        window.open(result.repoUrl, "_blank");
      } else {
        setDeployError(result.error || "Deployment failed");
      }
    } catch (err: any) {
      setDeployError(err.message || "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditedSkillMd(value);
      setHasUnsavedChanges(value !== skill?.files.skillMd);
    }
  };

  // Validation
  const validation = skill && editedSkillMd
    ? validateSkill(editedSkillMd, skill.files.scripts, skill.files.references)
    : null;

  // Parse frontmatter for preview
  const frontmatter = editedSkillMd
    ? parseFrontmatter(editedSkillMd).frontmatter
    : null;

  if (!skill) {
    return (
      <main className="flex flex-col h-screen p-12">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">
            Loading skill...
          </div>
        </div>
      </main>
    );
  }

  const currentContent = selectedFile === "SKILL.md"
    ? editedSkillMd || skill.files.skillMd
    : selectedFile.type === "script"
      ? skill.files.scripts?.[selectedFile.index]?.content || ""
      : selectedFile.type === "reference"
        ? skill.files.references?.[selectedFile.index]?.content || ""
        : "";

  const currentLanguage = selectedFile === "SKILL.md"
    ? "markdown"
    : selectedFile.type === "script"
      ? skill.files.scripts?.[selectedFile.index]?.language || "plaintext"
      : "markdown";

  return (
    <main className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/skills")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
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
          </button>
          <div>
            <h1 className="text-lg font-semibold">{skill.name}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                skill.status === "deployed"
                  ? "bg-green-500/10 text-green-500"
                  : skill.status === "draft"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-gray-500/10 text-gray-500"
              }`}
            >
              {skill.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-yellow-500">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          {skill.status === "deployed" && skill.githubUrl ? (
            <a
              href={skill.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm border rounded-lg hover:bg-accent flex items-center gap-2"
            >
              View on GitHub
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
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" x2="21" y1="14" y2="3" />
              </svg>
            </a>
          ) : null}
          <button
            onClick={handleDeploy}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            {skill.status === "deployed" ? "Redeploy" : "Deploy to GitHub"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Tree */}
        <div className="w-64 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold">Files</h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {/* Skill folder */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
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
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {skill.name}
              </div>

              {/* SKILL.md */}
              <button
                onClick={() => setSelectedFile("SKILL.md")}
                className={`w-full flex items-center gap-2 px-4 py-1 text-sm rounded ${
                  selectedFile === "SKILL.md"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                }`}
              >
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
                SKILL.md
              </button>

              {/* Scripts folder */}
              {skill.files.scripts && skill.files.scripts.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 py-1 text-sm text-muted-foreground">
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
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    scripts
                  </div>
                  {skill.files.scripts.map((script, index) => (
                    <button
                      key={`script-${index}`}
                      onClick={() =>
                        setSelectedFile({ type: "script", index })
                      }
                      className={`w-full flex items-center gap-2 px-6 py-1 text-sm rounded ${
                        typeof selectedFile !== "string" &&
                        selectedFile.type === "script" &&
                        selectedFile.index === index
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      }`}
                    >
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
                      {script.name}
                    </button>
                  ))}
                </>
              )}

              {/* References folder */}
              {skill.files.references && skill.files.references.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 py-1 text-sm text-muted-foreground">
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
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    references
                  </div>
                  {skill.files.references.map((ref, index) => (
                    <button
                      key={`ref-${index}`}
                      onClick={() =>
                        setSelectedFile({ type: "reference", index })
                      }
                      className={`w-full flex items-center gap-2 px-6 py-1 text-sm rounded ${
                        typeof selectedFile !== "string" &&
                        selectedFile.type === "reference" &&
                        selectedFile.index === index
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      }`}
                    >
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
                      {ref.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Version History */}
          <div className="border-t p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">
              Version History
            </h3>
            <div className="space-y-1 max-h-32 overflow-auto">
              {versions?.slice(0, 5).map((version) => (
                <div
                  key={version._id}
                  className="text-xs text-muted-foreground"
                >
                  v{version.version} -{" "}
                  {version.changeDescription || "No description"}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={currentContent}
              onChange={selectedFile === "SKILL.md" ? handleEditorChange : undefined}
              language={currentLanguage}
              readOnly={selectedFile !== "SKILL.md"}
              height="100%"
            />
          </div>

          {/* Validation Errors/Warnings */}
          {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="border-t p-3 max-h-32 overflow-auto">
              {validation.errors.map((err, i) => (
                <div key={`err-${i}`} className="text-xs text-red-500 flex items-center gap-2">
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {err.field}: {err.message}
                </div>
              ))}
              {validation.warnings.map((warn, i) => (
                <div key={`warn-${i}`} className="text-xs text-yellow-500 flex items-center gap-2">
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
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  {warn.field}: {warn.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="w-96 border-l flex flex-col">
          <div className="p-4 border-b">
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewMode("simulated")}
                className={`px-3 py-1 text-sm rounded ${
                  previewMode === "simulated"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                }`}
              >
                Simulated Usage
              </button>
              <button
                onClick={() => setPreviewMode("files")}
                className={`px-3 py-1 text-sm rounded ${
                  previewMode === "files"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                }`}
              >
                File View
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {previewMode === "simulated" ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h3 className="text-sm font-medium mb-2">
                    How Claude Code sees this skill:
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-mono">
                        {frontmatter?.name || skill.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <p className="mt-1 text-xs">
                        {frontmatter?.description || skill.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Triggered by:</h3>
                  <div className="flex flex-wrap gap-1">
                    {/* Extract keywords from description */}
                    {(frontmatter?.description || skill.description)
                      .toLowerCase()
                      .split(/[,.\s]+/)
                      .filter(
                        (word) =>
                          word.length > 4 &&
                          !["when", "this", "that", "with", "from", "your"].includes(
                            word
                          )
                      )
                      .slice(0, 6)
                      .map((keyword, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-muted rounded"
                        >
                          "{keyword}"
                        </span>
                      ))}
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-green-500/5 border-green-500/20">
                  <h3 className="text-sm font-medium mb-2 text-green-600">
                    Validation Status
                  </h3>
                  {validation?.valid ? (
                    <p className="text-xs text-green-600">
                      Skill is valid and ready to deploy
                    </p>
                  ) : (
                    <p className="text-xs text-red-500">
                      {validation?.errors.length} error(s) found
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                  {`${skill.name}/
├── SKILL.md
${skill.files.scripts?.length ? `├── scripts/\n${skill.files.scripts.map((s) => `│   └── ${s.name}`).join("\n")}\n` : ""}${skill.files.references?.length ? `├── references/\n${skill.files.references.map((r) => `│   └── ${r.name}`).join("\n")}\n` : ""}${skill.files.assets?.length ? `└── assets/\n${skill.files.assets.map((a) => `    └── ${a.name}`).join("\n")}` : ""}`}
                </pre>
              </div>
            )}
          </div>

          {/* Refine Chat */}
          <div className="border-t p-4">
            <h3 className="text-sm font-medium mb-2">Refine with AI</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Add error handling..."
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleRefine();
                  }
                }}
                disabled={isRefining}
              />
              <button
                onClick={handleRefine}
                disabled={isRefining || !chatInput.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
              >
                {isRefining ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deploy Dialog */}
      <AlertDialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy to GitHub</AlertDialogTitle>
            <AlertDialogDescription>
              Deploy your skill to GitHub to use it in Claude Code.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Deployment mode selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Deployment Target</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                  <input
                    type="radio"
                    name="deployMode"
                    value="new"
                    checked={deployMode === "new"}
                    onChange={() => setDeployMode("new")}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-sm">Create new repository</div>
                    <div className="text-xs text-muted-foreground">
                      Creates a new repo named "{skill.name}"
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent opacity-50">
                  <input
                    type="radio"
                    name="deployMode"
                    value="existing"
                    checked={deployMode === "existing"}
                    onChange={() => setDeployMode("existing")}
                    disabled
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-sm">Add to existing repository</div>
                    <div className="text-xs text-muted-foreground">
                      Coming soon
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {deployMode === "new" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={repoVisibility === "public"}
                        onChange={() => setRepoVisibility("public")}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Public</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={repoVisibility === "private"}
                        onChange={() => setRepoVisibility("private")}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Private</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">GitHub Personal Access Token</label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a token at{" "}
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=Toolkit%20Skill%20Deploy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      github.com/settings/tokens
                    </a>{" "}
                    with "repo" scope.
                  </p>
                </div>
              </>
            )}

            {deployError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500">{deployError}</p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeploying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeploying || !githubToken.trim()}
              onClick={(e) => {
                e.preventDefault();
                handleDeploySubmit();
              }}
            >
              {isDeploying ? "Deploying..." : "Deploy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
