/**
 * Team Workspaces
 * Manage team collaboration, members, and permissions
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new workspace
 */
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Create workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      ownerId: args.userId,
      settings: {
        defaultPermissions: "view",
        allowPublicServers: true,
      },
    });

    // Add owner as member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId: args.userId,
      role: "owner",
      joinedAt: Date.now(),
    });

    return workspaceId;
  },
});

/**
 * Get workspace by ID
 */
export const getWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workspaceId);
  },
});

/**
 * List user's workspaces
 */
export const listUserWorkspaces = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all workspace memberships
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Fetch workspace details
    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await ctx.db.get(membership.workspaceId);
        if (!workspace) return null;

        return {
          ...workspace,
          role: membership.role,
          memberCount: await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspace", (q) =>
              q.eq("workspaceId", membership.workspaceId)
            )
            .collect()
            .then((members) => members.length),
        };
      })
    );

    return workspaces.filter((w) => w !== null);
  },
});

/**
 * Add member to workspace
 */
export const addMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if already a member
    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw new Error("User is already a member of this workspace");
    }

    // Add member
    return await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      role: args.role,
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
      joinedAt: Date.now(),
    });
  },
});

/**
 * Remove member from workspace
 */
export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      throw new Error("User is not a member of this workspace");
    }

    // Cannot remove owner
    if (membership.role === "owner") {
      throw new Error("Cannot remove workspace owner");
    }

    await ctx.db.delete(membership._id);
  },
});

/**
 * Update member role
 */
export const updateMemberRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      throw new Error("User is not a member of this workspace");
    }

    // Cannot change owner role
    if (membership.role === "owner") {
      throw new Error("Cannot change owner role");
    }

    await ctx.db.patch(membership._id, {
      role: args.role,
    });
  },
});

/**
 * List workspace members
 */
export const listMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Enrich with user details
    return await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return {
          ...membership,
          user: user
            ? {
                name: user.name,
                email: user.email,
                imageUrl: user.imageUrl,
              }
            : null,
        };
      })
    );
  },
});

/**
 * Check if user has permission in workspace
 */
export const checkPermission = query({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    requiredRole: v.union(
      v.literal("viewer"),
      v.literal("editor"),
      v.literal("admin"),
      v.literal("owner")
    ),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      return false;
    }

    // Role hierarchy: owner > admin > editor > viewer
    const roleLevel: Record<string, number> = {
      owner: 4,
      admin: 3,
      editor: 2,
      viewer: 1,
    };

    return roleLevel[membership.role] >= roleLevel[args.requiredRole];
  },
});

/**
 * Delete workspace
 */
export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.ownerId !== args.userId) {
      throw new Error("Only workspace owner can delete workspace");
    }

    // Delete all members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete workspace
    await ctx.db.delete(args.workspaceId);
  },
});
