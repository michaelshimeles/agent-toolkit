"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export function DeployedSkills() {
  const { user, isLoaded } = useUser();

  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const skills = useQuery(
    api.skills.listUserSkills,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const deployedSkills = skills?.filter((s: any) => s.status === "deployed") || [];

  if (!isLoaded || !user) {
    return null;
  }

  if (skills === undefined) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Skills</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (deployedSkills.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Skills</h2>
          <Link
            href="/dashboard/skills"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Create
          </Link>
        </div>
        <div className="p-6 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No deployed skills yet.{" "}
            <Link href="/dashboard/skills" className="text-foreground hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">
          Skills
          <span className="ml-2 text-muted-foreground font-normal">
            {deployedSkills.length}
          </span>
        </h2>
        <Link
          href="/dashboard/skills"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {deployedSkills.slice(0, 6).map((skill: any) => (
          <Link
            key={skill._id}
            href={`/dashboard/skills/${skill._id}`}
            className="group p-4 border rounded-lg hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-sm font-medium line-clamp-1">
                {skill.name}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded shrink-0 ml-2">
                Live
              </span>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {skill.description}
            </p>

            <div className="text-xs text-muted-foreground">
              v{skill.metadata?.version || "1.0.0"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
