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
type NewFileType = "script" | "reference";

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

  // Rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  // New file dialog state
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileType, setNewFileType] = useState<NewFileType>("script");
  const [newFileName, setNewFileName] = useState("");
  const [newFileLanguage, setNewFileLanguage] = useState("python");

  // Delete file dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<SelectedFile | null>(null);

  // Local state for editing - now tracks all files
  const [editedSkillMd, setEditedSkillMd] = useState<string | null>(null);
  const [editedScripts, setEditedScripts] = useState<Map<number, string>>(new Map());
  const [editedReferences, setEditedReferences] = useState<Map<number, string>>(new Map());

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
    if (!skill) return;

    setIsSaving(true);
    try {
      // Build updated scripts array
      const updatedScripts = skill.files.scripts?.map((script, index) => {
        const edited = editedScripts.get(index);
        return edited !== undefined ? { ...script, content: edited } : script;
      });

      // Build updated references array
      const updatedReferences = skill.files.references?.map((ref, index) => {
        const edited = editedReferences.get(index);
        return edited !== undefined ? { ...ref, content: edited } : ref;
      });

      await updateSkill({
        skillId: skill._id,
        files: {
          ...skill.files,
          skillMd: editedSkillMd || skill.files.skillMd,
          scripts: updatedScripts,
          references: updatedReferences,
        },
        changeDescription: "Manual edit",
      });
      setHasUnsavedChanges(false);
      setEditedScripts(new Map());
      setEditedReferences(new Map());
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Rename handler
  const handleRename = async () => {
    if (!skill || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    const newName = editedName.trim().toLowerCase();

    // Validate name format
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(newName)) {
      setRenameError("Name must be lowercase letters, numbers, and hyphens only");
      return;
    }
    if (newName.length > 64) {
      setRenameError("Name must be 64 characters or less");
      return;
    }

    try {
      await updateSkill({
        skillId: skill._id,
        name: newName,
      });
      setIsEditingName(false);
      setRenameError(null);
    } catch (err: any) {
      setRenameError(err.message || "Failed to rename");
    }
  };

  // New file handler
  const handleCreateFile = async () => {
    if (!skill || !newFileName.trim()) return;

    const fileName = newFileName.trim();

    // Validate filename
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(fileName)) {
      return; // Invalid filename
    }

    const newFiles = { ...skill.files };

    if (newFileType === "script") {
      const newScript = {
        name: fileName,
        content: `# ${fileName}\n# Add your code here\n`,
        language: newFileLanguage,
      };
      newFiles.scripts = [...(newFiles.scripts || []), newScript];
    } else {
      const newRef = {
        name: fileName,
        content: `# ${fileName}\n\nAdd your reference content here.\n`,
      };
      newFiles.references = [...(newFiles.references || []), newRef];
    }

    try {
      await updateSkill({
        skillId: skill._id,
        files: newFiles,
        changeDescription: `Added ${newFileType}: ${fileName}`,
      });
      setShowNewFileDialog(false);
      setNewFileName("");

      // Select the new file
      if (newFileType === "script") {
        setSelectedFile({ type: "script", index: (newFiles.scripts?.length || 1) - 1 });
      } else {
        setSelectedFile({ type: "reference", index: (newFiles.references?.length || 1) - 1 });
      }
    } catch (err) {
      console.error("Failed to create file:", err);
    }
  };

  // Delete file handler
  const handleDeleteFile = async () => {
    if (!skill || !fileToDelete || fileToDelete === "SKILL.md") return;

    const newFiles = { ...skill.files };

    if (fileToDelete.type === "script") {
      newFiles.scripts = skill.files.scripts?.filter((_, i) => i !== fileToDelete.index);
    } else if (fileToDelete.type === "reference") {
      newFiles.references = skill.files.references?.filter((_, i) => i !== fileToDelete.index);
    }

    try {
      await updateSkill({
        skillId: skill._id,
        files: newFiles,
        changeDescription: `Deleted file`,
      });
      setShowDeleteDialog(false);
      setFileToDelete(null);
      setSelectedFile("SKILL.md");
    } catch (err) {
      console.error("Failed to delete file:", err);
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
    if (value === undefined) return;

    if (selectedFile === "SKILL.md") {
      setEditedSkillMd(value);
      setHasUnsavedChanges(value !== skill?.files.skillMd);
    } else if (selectedFile.type === "script") {
      const newEditedScripts = new Map(editedScripts);
      newEditedScripts.set(selectedFile.index, value);
      setEditedScripts(newEditedScripts);
      setHasUnsavedChanges(true);
    } else if (selectedFile.type === "reference") {
      const newEditedRefs = new Map(editedReferences);
      newEditedRefs.set(selectedFile.index, value);
      setEditedReferences(newEditedRefs);
      setHasUnsavedChanges(true);
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
      ? editedScripts.get(selectedFile.index) ?? skill.files.scripts?.[selectedFile.index]?.content ?? ""
      : selectedFile.type === "reference"
        ? editedReferences.get(selectedFile.index) ?? skill.files.references?.[selectedFile.index]?.content ?? ""
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
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename();
                      if (e.key === "Escape") {
                        setIsEditingName(false);
                        setRenameError(null);
                      }
                    }}
                    className="text-lg font-semibold bg-transparent border-b border-primary focus:outline-none w-48"
                    autoFocus
                    placeholder="skill-name"
                  />
                  {renameError && (
                    <span className="text-xs text-red-500">{renameError}</span>
                  )}
                </div>
              ) : (
                <>
                  <h1 className="text-lg font-semibold">{skill.name}</h1>
                  <button
                    onClick={() => {
                      setEditedName(skill.name);
                      setIsEditingName(true);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    title="Rename skill"
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
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                </>
              )}
            </div>
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
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Files</h2>
            <button
              onClick={() => setShowNewFileDialog(true)}
              className="text-muted-foreground hover:text-foreground"
              title="Add new file"
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
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
                    <div
                      key={`script-${index}`}
                      className={`group w-full flex items-center justify-between px-6 py-1 text-sm rounded ${
                        typeof selectedFile !== "string" &&
                        selectedFile.type === "script" &&
                        selectedFile.index === index
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setSelectedFile({ type: "script", index })
                        }
                        className="flex items-center gap-2 flex-1 text-left"
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileToDelete({ type: "script", index });
                          setShowDeleteDialog(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500"
                        title="Delete file"
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
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
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
                    <div
                      key={`ref-${index}`}
                      className={`group w-full flex items-center justify-between px-6 py-1 text-sm rounded ${
                        typeof selectedFile !== "string" &&
                        selectedFile.type === "reference" &&
                        selectedFile.index === index
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setSelectedFile({ type: "reference", index })
                        }
                        className="flex items-center gap-2 flex-1 text-left"
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileToDelete({ type: "reference", index });
                          setShowDeleteDialog(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500"
                        title="Delete file"
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
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
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
              onChange={handleEditorChange}
              language={currentLanguage}
              readOnly={false}
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

      {/* New File Dialog */}
      <AlertDialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Create New File</AlertDialogTitle>
            <AlertDialogDescription>
              Add a new script or reference file to your skill.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fileType"
                    value="script"
                    checked={newFileType === "script"}
                    onChange={() => setNewFileType("script")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Script</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fileType"
                    value="reference"
                    checked={newFileType === "reference"}
                    onChange={() => setNewFileType("reference")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Reference</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">File Name</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={newFileType === "script" ? "script.py" : "REFERENCE.md"}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Include the file extension (e.g., .py, .js, .sh, .md)
              </p>
            </div>

            {newFileType === "script" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select
                  value={newFileLanguage}
                  onChange={(e) => setNewFileLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="bash">Bash</option>
                  <option value="typescript">TypeScript</option>
                </select>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!newFileName.trim()}
              onClick={(e) => {
                e.preventDefault();
                handleCreateFile();
              }}
            >
              Create File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFileToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
