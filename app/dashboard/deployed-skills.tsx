"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export function DeployedSkills() {
  const { user, isLoaded } = useUser();

  // Get Convex user
  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get user's skills
  const skills = useQuery(
    api.skills.listUserSkills,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Filter to only deployed skills
  const deployedSkills = skills?.filter((s: any) => s.status === "deployed") || [];

  if (!isLoaded || !user) {
    return null;
  }

  if (skills === undefined) {
    return (
      <div className="w-full mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Deployed Skills</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-full mb-3"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (deployedSkills.length === 0) {
    return (
      <div className="w-full mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Deployed Skills</h2>
          <Link
            href="/dashboard/skills"
            className="text-sm text-primary hover:text-primary/80"
          >
            Create New →
          </Link>
        </div>
        <div className="p-8 border border-dashed rounded-lg text-center">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-muted-foreground text-sm mb-3">
            No deployed skills yet
          </p>
          <Link
            href="/dashboard/skills"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Create your first skill →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Deployed Skills ({deployedSkills.length})
        </h2>
        <Link
          href="/dashboard/skills"
          className="text-sm text-primary hover:text-primary/80"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deployedSkills.slice(0, 6).map((skill: any) => (
          <Link
            key={skill._id}
            href={`/dashboard/skills/${skill._id}`}
            className="group p-4 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                {skill.name}
              </h3>
              <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full shrink-0 ml-2">
                Live
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {skill.description}
            </p>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                v{skill.metadata?.version || "1.0.0"}
              </span>
              {skill.githubUrl && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(skill.githubUrl, "_blank");
                  }}
                  className="text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1"
                >
                  GitHub
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
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {deployedSkills.length > 6 && (
        <div className="mt-4 text-center">
          <Link
            href="/dashboard/skills"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View {deployedSkills.length - 6} more skills →
          </Link>
        </div>
      )}
    </div>
  );
}
