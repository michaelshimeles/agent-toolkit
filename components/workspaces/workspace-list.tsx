"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { LoadingPage } from "@/components/loading";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Settings } from "lucide-react";

export function WorkspaceList() {
  const { user, isLoaded } = useUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");

  // Get Convex user
  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  // Ensure user exists in Convex
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

  const workspaces = useQuery(
    api.workspaces.listUserWorkspaces,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convexUser || !workspaceName.trim()) return;

    try {
      await createWorkspace({
        name: workspaceName,
        description: workspaceDescription || undefined,
        userId: convexUser._id,
      });

      setIsCreateOpen(false);
      setWorkspaceName("");
      setWorkspaceDescription("");
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  if (!user) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Team Workspaces</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>
                  Create a new team workspace to collaborate on servers
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="My Team"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={workspaceDescription}
                    onChange={(e) => setWorkspaceDescription(e.target.value)}
                    placeholder="What this workspace is for..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!workspaces && (
        <div className="flex items-center justify-center py-12">
          <LoadingPage />
        </div>
      )}

      {workspaces && workspaces.length === 0 && (
        <div className="text-center py-12 bg-muted rounded-lg">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            No workspaces yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Create a workspace to collaborate with your team
          </p>
        </div>
      )}

      {workspaces && workspaces.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <div
              key={workspace._id}
              className="bg-card border rounded-lg p-6 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {workspace.name}
                  </h3>
                  {workspace.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {workspace.description}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href={`/dashboard/workspaces/${workspace._id}`}>
                    <Settings className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{workspace.memberCount} members</span>
                </div>
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                  {workspace.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
