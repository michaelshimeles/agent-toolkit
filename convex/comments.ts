/**
 * Comments and Reviews
 * Manage server comments, code reviews, and discussions
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Add comment to server
 */
export const addComment = mutation({
  args: {
    serverId: v.id("generatedServers"),
    userId: v.id("users"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
    codeLineNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.content.trim()) {
      throw new Error("Comment content cannot be empty");
    }

    return await ctx.db.insert("comments", {
      serverId: args.serverId,
      userId: args.userId,
      content: args.content,
      parentCommentId: args.parentCommentId,
      codeLineNumber: args.codeLineNumber,
      resolved: false,
    });
  },
});

/**
 * Update comment
 */
export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== args.userId) {
      throw new Error("Only comment author can edit comment");
    }

    if (!args.content.trim()) {
      throw new Error("Comment content cannot be empty");
    }

    await ctx.db.patch(args.commentId, {
      content: args.content,
    });
  },
});

/**
 * Delete comment
 */
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== args.userId) {
      throw new Error("Only comment author can delete comment");
    }

    // Delete all replies
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentCommentId", args.commentId))
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    // Delete comment
    await ctx.db.delete(args.commentId);
  },
});

/**
 * Resolve comment
 */
export const resolveComment = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    await ctx.db.patch(args.commentId, {
      resolved: true,
      resolvedBy: args.userId,
      resolvedAt: Date.now(),
    });
  },
});

/**
 * Unresolve comment
 */
export const unresolveComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    await ctx.db.patch(args.commentId, {
      resolved: false,
      resolvedBy: undefined,
      resolvedAt: undefined,
    });
  },
});

/**
 * List comments for server
 */
export const listComments = query({
  args: {
    serverId: v.id("generatedServers"),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let comments = await ctx.db
      .query("comments")
      .withIndex("by_server", (q) => q.eq("serverId", args.serverId))
      .collect();

    // Filter resolved if needed
    if (!args.includeResolved) {
      comments = comments.filter((c) => !c.resolved);
    }

    // Enrich with user details
    return await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        const resolvedByUser = comment.resolvedBy
          ? await ctx.db.get(comment.resolvedBy)
          : null;

        return {
          ...comment,
          user: user
            ? {
                name: user.name,
                email: user.email,
                imageUrl: user.imageUrl,
              }
            : null,
          resolvedBy: resolvedByUser
            ? {
                name: resolvedByUser.name,
                email: resolvedByUser.email,
              }
            : null,
        };
      })
    );
  },
});

/**
 * List replies to a comment
 */
export const listReplies = query({
  args: {
    parentCommentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentCommentId", args.parentCommentId))
      .collect();

    // Enrich with user details
    return await Promise.all(
      replies.map(async (reply) => {
        const user = await ctx.db.get(reply.userId);
        return {
          ...reply,
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
 * Get comment by ID
 */
export const getComment = query({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      return null;
    }

    const user = await ctx.db.get(comment.userId);
    return {
      ...comment,
      user: user
        ? {
            name: user.name,
            email: user.email,
            imageUrl: user.imageUrl,
          }
        : null,
    };
  },
});

/**
 * Get comment count for server
 */
export const getCommentCount = query({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_server", (q) => q.eq("serverId", args.serverId))
      .collect();

    const resolved = comments.filter((c) => c.resolved).length;
    const unresolved = comments.filter((c) => !c.resolved).length;

    return {
      total: comments.length,
      resolved,
      unresolved,
    };
  },
});
