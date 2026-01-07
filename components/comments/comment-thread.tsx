"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Reply,
  Check,
  MoreVertical,
  Trash2,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface CommentThreadProps {
  serverId: string;
  includeResolved?: boolean;
}

export function CommentThread({ serverId, includeResolved = false }: CommentThreadProps) {
  const { user, isLoaded } = useUser();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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

  const comments = useQuery(
    api.comments.listComments,
    serverId ? { serverId: serverId as any, includeResolved } : "skip"
  );

  const commentCount = useQuery(
    api.comments.getCommentCount,
    serverId ? { serverId: serverId as any } : "skip"
  );

  const addComment = useMutation(api.comments.addComment);
  const updateComment = useMutation(api.comments.updateComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const resolveComment = useMutation(api.comments.resolveComment);
  const unresolveComment = useMutation(api.comments.unresolveComment);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convexUser || !newComment.trim()) return;

    try {
      await addComment({
        serverId: serverId as any,
        userId: convexUser._id,
        content: newComment,
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleReply = async (parentCommentId: string) => {
    if (!convexUser || !replyContent.trim()) return;

    try {
      await addComment({
        serverId: serverId as any,
        userId: convexUser._id,
        content: replyContent,
        parentCommentId: parentCommentId as any,
      });
      setReplyingTo(null);
      setReplyContent("");
    } catch (error) {
      console.error("Failed to add reply:", error);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!convexUser || !editContent.trim()) return;

    try {
      await updateComment({
        commentId: commentId as any,
        content: editContent,
        userId: convexUser._id,
      });
      setEditingId(null);
      setEditContent("");
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!convexUser) return;

    if (confirm("Are you sure you want to delete this comment?")) {
      try {
        await deleteComment({
          commentId: commentId as any,
          userId: convexUser._id,
        });
      } catch (error) {
        console.error("Failed to delete comment:", error);
      }
    }
  };

  const handleResolve = async (commentId: string) => {
    if (!convexUser) return;

    try {
      await resolveComment({
        commentId: commentId as any,
        userId: convexUser._id,
      });
    } catch (error) {
      console.error("Failed to resolve comment:", error);
    }
  };

  const handleUnresolve = async (commentId: string) => {
    try {
      await unresolveComment({
        commentId: commentId as any,
      });
    } catch (error) {
      console.error("Failed to unresolve comment:", error);
    }
  };

  const startEdit = (commentId: string, content: string) => {
    setEditingId(commentId);
    setEditContent(content);
  };

  const rootComments = comments?.filter((c) => !c.parentCommentId) || [];

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
          {commentCount && (
            <span className="text-sm text-muted-foreground">
              ({commentCount.unresolved} active, {commentCount.resolved} resolved)
            </span>
          )}
        </h3>
      </div>

      {/* New Comment Form */}
      {user && (
        <form onSubmit={handleAddComment} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            maxLength={5000}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!newComment.trim()}>
              Comment
            </Button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {rootComments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        )}

        {rootComments.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            allComments={comments || []}
            convexUser={convexUser}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            editingId={editingId}
            editContent={editContent}
            handleReply={handleReply}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleResolve={handleResolve}
            handleUnresolve={handleUnresolve}
            startEdit={startEdit}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  allComments,
  convexUser,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  editingId,
  editContent,
  handleReply,
  handleEdit,
  handleDelete,
  handleResolve,
  handleUnresolve,
  startEdit,
}: any) {
  const replies = allComments.filter((c: any) => c.parentCommentId === comment._id);
  const isOwner = convexUser?._id === comment.userId;
  const isEditing = editingId === comment._id;
  const isReplying = replyingTo === comment._id;

  return (
    <div
      className={`border-l-2 pl-4 ${
        comment.resolved ? "border-green-500 opacity-60" : "border-border"
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.user?.imageUrl} />
            <AvatarFallback>
              {comment.user?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.user?.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(comment._creationTime, { addSuffix: true })}
              </span>
              {comment.resolved && (
                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded">
                  Resolved
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                  maxLength={5000}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEdit(comment._id)}
                    disabled={!editContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {comment.content}
              </p>
            )}

            {!isEditing && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(comment._id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>

                {!comment.resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolve(comment._id)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                )}

                {comment.resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnresolve(comment._id)}
                  >
                    Unresolve
                  </Button>
                )}

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => startEdit(comment._id, comment.content)}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(comment._id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* Reply Form */}
            {isReplying && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  maxLength={5000}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReply(comment._id)}
                    disabled={!replyContent.trim()}
                  >
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Nested Replies */}
            {replies.length > 0 && (
              <div className="mt-4 space-y-3">
                {replies.map((reply: any) => (
                  <CommentItem
                    key={reply._id}
                    comment={reply}
                    allComments={allComments}
                    convexUser={convexUser}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyContent={replyContent}
                    setReplyContent={setReplyContent}
                    editingId={editingId}
                    editContent={editContent}
                    handleReply={handleReply}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    handleResolve={handleResolve}
                    handleUnresolve={handleUnresolve}
                    startEdit={startEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
