"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoadingCard } from "@/components/loading";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SkillsClientProps {
  clerkId: string;
}

type TabType = "my-skills" | "templates" | "examples";

export default function SkillsClient({ clerkId }: SkillsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("my-skills");
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

  // Get user's skills
  const skills = useQuery(
    api.skills.listUserSkills,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Delete skill mutation
  const deleteSkill = useMutation(api.skills.deleteSkill);

  // State for delete dialog
  const [skillToDelete, setSkillToDelete] = useState<{
    id: Id<"skills">;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteSkill = async () => {
    if (!skillToDelete) return;

    setIsDeleting(true);
    try {
      await deleteSkill({ skillId: skillToDelete.id });
      setSkillToDelete(null);
    } catch (err) {
      console.error("Failed to delete skill:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "deployed":
        return "bg-green-500/10 text-green-500";
      case "draft":
        return "bg-yellow-500/10 text-yellow-500";
      case "archived":
        return "bg-gray-500/10 text-gray-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <main className="min-h-screen px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and deploy Agent Skills for Claude Code
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/skills/new")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2"
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
            New Skill
          </button>
        </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {[
          { id: "my-skills" as const, label: "My Skills" },
          { id: "templates" as const, label: "Templates" },
          { id: "examples" as const, label: "Examples" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "templates") {
                router.push("/dashboard/skills/templates");
              } else {
                setActiveTab(tab.id);
              }
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "my-skills" && (
        <>
          {skills === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <LoadingCard />
              <LoadingCard />
            </div>
          ) : skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-6" />
                  <path d="M9 15h6" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">No skills yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                Create your first Agent Skill to extend Claude Code with custom
                capabilities.
              </p>
              <button
                onClick={() => router.push("/dashboard/skills/new")}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
              >
                Create Your First Skill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skills.map((skill) => (
                <div
                  key={skill._id}
                  onClick={() =>
                    router.push(`/dashboard/skills/${skill._id}`)
                  }
                  className="flex flex-col p-6 border rounded-lg bg-card hover:bg-accent transition-colors group relative cursor-pointer"
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSkillToDelete({ id: skill._id, name: skill.name });
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                    title="Delete skill"
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
                      <line x1="10" x2="10" y1="11" y2="17" />
                      <line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                  </button>

                  <div className="flex items-start justify-between mb-4 pr-8">
                    <div>
                      <h3 className="font-semibold text-lg">{skill.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        v{skill.metadata.version}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getStatusColor(
                        skill.status
                      )}`}
                    >
                      {skill.status}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-2">
                    {skill.description}
                  </p>

                  {/* File indicators */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs px-2 py-1 bg-muted rounded flex items-center gap-1">
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
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      SKILL.md
                    </span>
                    {skill.files.scripts && skill.files.scripts.length > 0 && (
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {skill.files.scripts.length} script
                        {skill.files.scripts.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {skill.files.references &&
                      skill.files.references.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-muted rounded">
                          {skill.files.references.length} reference
                          {skill.files.references.length > 1 ? "s" : ""}
                        </span>
                      )}
                  </div>

                  {/* GitHub link if deployed */}
                  {skill.githubUrl && (
                    <a
                      href={skill.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      View on GitHub
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "examples" && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Example Gallery Coming Soon</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Browse community-contributed skills and official examples from
            Anthropic.
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={skillToDelete !== null}
        onOpenChange={(open) => !open && setSkillToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-red-500/10">
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
                className="text-red-500"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{skillToDelete?.name}</strong>? This action cannot be
              undone and will permanently remove the skill and all its versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSkill}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Skill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </main>
  );
}
