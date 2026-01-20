/**
 * Server Sharing
 * Manage server access and permissions
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Share server with user
 */
export const shareWithUser = mutation({
  args: {
    serverId: v.id("generatedServers"),
    userId: v.id("users"),
    permission: v.union(
      v.literal("view"),
      v.literal("edit"),
      v.literal("admin")
    ),
    sharedBy: v.id("users"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("serverShares", {
      serverId: args.serverId,
      sharedWith: "user",
      userId: args.userId,
      permission: args.permission,
      sharedBy: args.sharedBy,
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * Share server with workspace
 */
export const shareWithWorkspace = mutation({
  args: {
    serverId: v.id("generatedServers"),
    workspaceId: v.id("workspaces"),
    permission: v.union(
      v.literal("view"),
      v.literal("edit"),
      v.literal("admin")
    ),
    sharedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Update server to belong to workspace
    await ctx.db.patch(args.serverId, {
      workspaceId: args.workspaceId,
    });

    return await ctx.db.insert("serverShares", {
      serverId: args.serverId,
      sharedWith: "workspace",
      permission: args.permission,
      sharedBy: args.sharedBy,
    });
  },
});

/**
 * Make server public
 */
export const makePublic = mutation({
  args: {
    serverId: v.id("generatedServers"),
    permission: v.union(v.literal("view"), v.literal("edit")),
    sharedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Update server to public
    await ctx.db.patch(args.serverId, {
      isPublic: true,
    });

    return await ctx.db.insert("serverShares", {
      serverId: args.serverId,
      sharedWith: "public",
      permission: args.permission,
      sharedBy: args.sharedBy,
    });
  },
});

/**
 * Remove share
 */
export const removeShare = mutation({
  args: {
    shareId: v.id("serverShares"),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db.get(args.shareId);
    if (!share) {
      throw new Error("Share not found");
    }

    // If it was a public share, update server
    if (share.sharedWith === "public") {
      await ctx.db.patch(share.serverId, {
        isPublic: false,
      });
    }

    await ctx.db.delete(args.shareId);
  },
});

/**
 * List shares for a server
 */
export const listServerShares = query({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, args) => {
    const shares = await ctx.db
      .query("serverShares")
      .withIndex("by_server", (q) => q.eq("serverId", args.serverId))
      .collect();

    // Enrich with user/workspace details
    return await Promise.all(
      shares.map(async (share) => {
        let details = null;

        if (share.sharedWith === "user" && share.userId) {
          const user = await ctx.db.get(share.userId);
          details = user
            ? {
                name: user.name,
                email: user.email,
              }
            : null;
        }

        const sharedByUser = await ctx.db.get(share.sharedBy);

        return {
          ...share,
          details,
          sharedByUser: sharedByUser
            ? {
                name: sharedByUser.name,
                email: sharedByUser.email,
              }
            : null,
        };
      })
    );
  },
});

/**
 * Check if user has access to server
 */
export const checkAccess = query({
  args: {
    serverId: v.id("generatedServers"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      return { hasAccess: false, permission: null };
    }

    // Owner always has admin access
    if (server.userId === args.userId) {
      return { hasAccess: true, permission: "admin" as const };
    }

    // Check if server is public
    if (server.isPublic) {
      const publicShare = await ctx.db
        .query("serverShares")
        .withIndex("by_server", (q) => q.eq("serverId", args.serverId))
        .filter((q) => q.eq(q.field("sharedWith"), "public"))
        .first();

      if (publicShare) {
        return { hasAccess: true, permission: publicShare.permission };
      }
    }

    // Check user-specific share
    const userShare = await ctx.db
      .query("serverShares")
      .withIndex("by_server", (q) => q.eq("serverId", args.serverId))
      .filter((q) =>
        q.and(
          q.eq(q.field("sharedWith"), "user"),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (userShare) {
      // Check if expired
      if (userShare.expiresAt && userShare.expiresAt < Date.now()) {
        return { hasAccess: false, permission: null };
      }
      return { hasAccess: true, permission: userShare.permission };
    }

    // Check workspace share
    if (server.workspaceId) {
      const membership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", server.workspaceId as any).eq("userId", args.userId)
        )
        .first();

      if (membership) {
        // Map workspace role to server permission
        const roleToPermission: Record<string, "view" | "edit" | "admin"> = {
          owner: "admin",
          admin: "admin",
          editor: "edit",
          viewer: "view",
        };

        return {
          hasAccess: true,
          permission: roleToPermission[membership.role] || "view",
        };
      }
    }

    return { hasAccess: false, permission: null };
  },
});

/**
 * List servers shared with user
 */
export const listSharedWithUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get direct shares
    const directShares = await ctx.db
      .query("serverShares")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get workspace shares
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const workspaceServerIds = new Set<string>();
    for (const membership of memberships) {
      const servers = await ctx.db
        .query("generatedServers")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", membership.workspaceId)
        )
        .collect();

      servers.forEach((s) => workspaceServerIds.add(s._id));
    }

    // Combine and fetch server details
    const serverIds = new Set([
      ...directShares.map((s) => s.serverId),
      ...Array.from(workspaceServerIds),
    ]);

    const servers = await Promise.all(
      Array.from(serverIds).map(async (id) => {
        const server = await ctx.db.get(id as Id<"generatedServers">);
        if (!server) return null;

        // Check if user is owner
        if (server.userId === args.userId) {
          return null; // Don't include own servers
        }

        return server;
      })
    );

    return servers.filter((s) => s !== null);
  },
});

/**
 * Get server by share link
 */
export const getSharedServer = query({
  args: {
    serverId: v.id("generatedServers"),
    shareId: v.id("serverShares"),
  },
  handler: async (ctx, args) => {
    // Verify share exists
    const share = await ctx.db.get(args.shareId);
    if (!share || share.serverId !== args.serverId) {
      return null;
    }

    // Check if share has expired
    if (share.expiresAt && share.expiresAt < Date.now()) {
      return null;
    }

    // Get server
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      return null;
    }

    // Get owner info
    const owner = await ctx.db.get(server.userId);

    return {
      server,
      share,
      owner: owner
        ? {
            name: owner.name,
            email: owner.email,
            imageUrl: owner.imageUrl,
          }
        : null,
    };
  },
});
