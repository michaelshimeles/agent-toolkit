/**
 * Collaboration Utilities
 * Pure functions for collaboration logic and permission checking
 */

export type Role = "owner" | "admin" | "editor" | "viewer";
export type Permission = "view" | "edit" | "admin";

/**
 * Role hierarchy levels
 */
export const ROLE_LEVELS: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Check if user has required permission based on role
 */
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

/**
 * Map workspace role to server permission
 */
export function roleToPermission(role: Role): Permission {
  const mapping: Record<Role, Permission> = {
    owner: "admin",
    admin: "admin",
    editor: "edit",
    viewer: "view",
  };
  return mapping[role];
}

/**
 * Check if permission is valid for action
 */
export function canPerformAction(
  permission: Permission,
  action: "view" | "edit" | "delete" | "share"
): boolean {
  const permissionLevels: Record<Permission, number> = {
    view: 1,
    edit: 2,
    admin: 3,
  };

  const actionRequirements: Record<string, number> = {
    view: 1,
    edit: 2,
    delete: 3,
    share: 3,
  };

  return permissionLevels[permission] >= actionRequirements[action];
}

/**
 * Check if share has expired
 */
export function isShareExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false;
  return expiresAt < Date.now();
}

/**
 * Format role name for display
 */
export function formatRoleName(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Format permission name for display
 */
export function formatPermissionName(permission: Permission): string {
  const names: Record<Permission, string> = {
    view: "Can View",
    edit: "Can Edit",
    admin: "Full Access",
  };
  return names[permission];
}

/**
 * Validate workspace name
 */
export function validateWorkspaceName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || !name.trim()) {
    return { valid: false, error: "Workspace name is required" };
  }

  if (name.length < 3) {
    return { valid: false, error: "Workspace name must be at least 3 characters" };
  }

  if (name.length > 50) {
    return { valid: false, error: "Workspace name must be less than 50 characters" };
  }

  return { valid: true };
}

/**
 * Validate comment content
 */
export function validateComment(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || !content.trim()) {
    return { valid: false, error: "Comment cannot be empty" };
  }

  if (content.length > 5000) {
    return { valid: false, error: "Comment must be less than 5000 characters" };
  }

  return { valid: true };
}

/**
 * Generate share link
 */
export function generateShareLink(serverId: string, shareId: string): string {
  return `/s/${serverId}?share=${shareId}`;
}

/**
 * Parse share link
 */
export function parseShareLink(link: string): {
  serverId: string | null;
  shareId: string | null;
} {
  try {
    const url = new URL(link, "https://example.com");
    const pathParts = url.pathname.split("/");
    const serverId = pathParts[2] || null;
    const shareId = url.searchParams.get("share");

    return { serverId, shareId };
  } catch {
    return { serverId: null, shareId: null };
  }
}

/**
 * Get available actions for permission
 */
export function getAvailableActions(permission: Permission): string[] {
  const actions: Record<Permission, string[]> = {
    view: ["view"],
    edit: ["view", "edit"],
    admin: ["view", "edit", "delete", "share"],
  };
  return actions[permission];
}

/**
 * Filter members by role
 */
export function filterMembersByRole(
  members: Array<{ role: Role }>,
  role: Role
): Array<{ role: Role }> {
  return members.filter((m) => m.role === role);
}

/**
 * Count members by role
 */
export function countMembersByRole(
  members: Array<{ role: Role }>
): Record<Role, number> {
  return {
    owner: members.filter((m) => m.role === "owner").length,
    admin: members.filter((m) => m.role === "admin").length,
    editor: members.filter((m) => m.role === "editor").length,
    viewer: members.filter((m) => m.role === "viewer").length,
  };
}

/**
 * Sort comments by creation time
 */
export function sortCommentsByTime(
  comments: Array<{ _creationTime: number }>,
  order: "asc" | "desc" = "desc"
): Array<{ _creationTime: number }> {
  return [...comments].sort((a, b) => {
    return order === "desc"
      ? b._creationTime - a._creationTime
      : a._creationTime - b._creationTime;
  });
}

/**
 * Group comments by resolved status
 */
export function groupCommentsByStatus(
  comments: Array<{ resolved?: boolean }>
): {
  resolved: Array<{ resolved?: boolean }>;
  unresolved: Array<{ resolved?: boolean }>;
} {
  return {
    resolved: comments.filter((c) => c.resolved),
    unresolved: comments.filter((c) => !c.resolved),
  };
}

/**
 * Build comment thread (parent + replies)
 */
export function buildCommentThread<T extends { _id: string; parentCommentId?: string }>(
  comments: T[]
): Map<string, T[]> {
  const threads = new Map<string, T[]>();

  comments.forEach((comment) => {
    const parentId = comment.parentCommentId || "root";
    const thread = threads.get(parentId) || [];
    thread.push(comment);
    threads.set(parentId, thread);
  });

  return threads;
}
