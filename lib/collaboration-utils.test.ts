/**
 * Tests for Collaboration Utilities
 */

import { describe, it, expect } from "vitest";
import {
  hasPermission,
  roleToPermission,
  canPerformAction,
  isShareExpired,
  formatRoleName,
  formatPermissionName,
  validateWorkspaceName,
  validateComment,
  generateShareLink,
  parseShareLink,
  getAvailableActions,
  filterMembersByRole,
  countMembersByRole,
  sortCommentsByTime,
  groupCommentsByStatus,
  buildCommentThread,
  ROLE_LEVELS,
} from "./collaboration-utils";

describe("Collaboration Utilities", () => {
  describe("hasPermission", () => {
    it("should allow owner to do anything", () => {
      expect(hasPermission("owner", "viewer")).toBe(true);
      expect(hasPermission("owner", "editor")).toBe(true);
      expect(hasPermission("owner", "admin")).toBe(true);
      expect(hasPermission("owner", "owner")).toBe(true);
    });

    it("should enforce role hierarchy", () => {
      expect(hasPermission("admin", "viewer")).toBe(true);
      expect(hasPermission("admin", "editor")).toBe(true);
      expect(hasPermission("admin", "admin")).toBe(true);
      expect(hasPermission("admin", "owner")).toBe(false);
    });

    it("should deny insufficient permissions", () => {
      expect(hasPermission("viewer", "editor")).toBe(false);
      expect(hasPermission("viewer", "admin")).toBe(false);
      expect(hasPermission("viewer", "owner")).toBe(false);
    });

    it("should allow same-level permissions", () => {
      expect(hasPermission("viewer", "viewer")).toBe(true);
      expect(hasPermission("editor", "editor")).toBe(true);
    });
  });

  describe("roleToPermission", () => {
    it("should map owner to admin permission", () => {
      expect(roleToPermission("owner")).toBe("admin");
    });

    it("should map admin to admin permission", () => {
      expect(roleToPermission("admin")).toBe("admin");
    });

    it("should map editor to edit permission", () => {
      expect(roleToPermission("editor")).toBe("edit");
    });

    it("should map viewer to view permission", () => {
      expect(roleToPermission("viewer")).toBe("view");
    });
  });

  describe("canPerformAction", () => {
    it("should allow view action for all permissions", () => {
      expect(canPerformAction("view", "view")).toBe(true);
      expect(canPerformAction("edit", "view")).toBe(true);
      expect(canPerformAction("admin", "view")).toBe(true);
    });

    it("should require edit permission for edit action", () => {
      expect(canPerformAction("view", "edit")).toBe(false);
      expect(canPerformAction("edit", "edit")).toBe(true);
      expect(canPerformAction("admin", "edit")).toBe(true);
    });

    it("should require admin permission for delete", () => {
      expect(canPerformAction("view", "delete")).toBe(false);
      expect(canPerformAction("edit", "delete")).toBe(false);
      expect(canPerformAction("admin", "delete")).toBe(true);
    });

    it("should require admin permission for share", () => {
      expect(canPerformAction("view", "share")).toBe(false);
      expect(canPerformAction("edit", "share")).toBe(false);
      expect(canPerformAction("admin", "share")).toBe(true);
    });
  });

  describe("isShareExpired", () => {
    it("should return false when no expiration", () => {
      expect(isShareExpired(undefined)).toBe(false);
    });

    it("should return true when expired", () => {
      const pastTime = Date.now() - 10000;
      expect(isShareExpired(pastTime)).toBe(true);
    });

    it("should return false when not expired", () => {
      const futureTime = Date.now() + 10000;
      expect(isShareExpired(futureTime)).toBe(false);
    });
  });

  describe("formatRoleName", () => {
    it("should capitalize role names", () => {
      expect(formatRoleName("owner")).toBe("Owner");
      expect(formatRoleName("admin")).toBe("Admin");
      expect(formatRoleName("editor")).toBe("Editor");
      expect(formatRoleName("viewer")).toBe("Viewer");
    });
  });

  describe("formatPermissionName", () => {
    it("should format permission names", () => {
      expect(formatPermissionName("view")).toBe("Can View");
      expect(formatPermissionName("edit")).toBe("Can Edit");
      expect(formatPermissionName("admin")).toBe("Full Access");
    });
  });

  describe("validateWorkspaceName", () => {
    it("should accept valid names", () => {
      expect(validateWorkspaceName("My Workspace").valid).toBe(true);
      expect(validateWorkspaceName("Team ABC").valid).toBe(true);
    });

    it("should reject empty names", () => {
      const result = validateWorkspaceName("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should reject too short names", () => {
      const result = validateWorkspaceName("AB");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least 3");
    });

    it("should reject too long names", () => {
      const result = validateWorkspaceName("A".repeat(51));
      expect(result.valid).toBe(false);
      expect(result.error).toContain("less than 50");
    });

    it("should trim whitespace", () => {
      const result = validateWorkspaceName("   ");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateComment", () => {
    it("should accept valid comments", () => {
      expect(validateComment("This is a comment").valid).toBe(true);
      expect(validateComment("A".repeat(100)).valid).toBe(true);
    });

    it("should reject empty comments", () => {
      const result = validateComment("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should reject too long comments", () => {
      const result = validateComment("A".repeat(5001));
      expect(result.valid).toBe(false);
      expect(result.error).toContain("5000");
    });

    it("should trim whitespace", () => {
      const result = validateComment("   ");
      expect(result.valid).toBe(false);
    });
  });

  describe("generateShareLink", () => {
    it("should generate share link", () => {
      const link = generateShareLink("server123", "share456");
      expect(link).toBe("/s/server123?share=share456");
    });

    it("should handle different IDs", () => {
      const link = generateShareLink("abc", "def");
      expect(link).toContain("abc");
      expect(link).toContain("def");
    });
  });

  describe("parseShareLink", () => {
    it("should parse valid share link", () => {
      const result = parseShareLink("https://example.com/s/server123?share=share456");
      expect(result.serverId).toBe("server123");
      expect(result.shareId).toBe("share456");
    });

    it("should handle relative links", () => {
      const result = parseShareLink("/s/server123?share=share456");
      expect(result.serverId).toBe("server123");
      expect(result.shareId).toBe("share456");
    });

    it("should return null for invalid links", () => {
      const result = parseShareLink("invalid");
      expect(result.serverId).toBe(null);
      expect(result.shareId).toBe(null);
    });

    it("should handle missing share parameter", () => {
      const result = parseShareLink("/s/server123");
      expect(result.serverId).toBe("server123");
      expect(result.shareId).toBe(null);
    });
  });

  describe("getAvailableActions", () => {
    it("should return view-only for view permission", () => {
      const actions = getAvailableActions("view");
      expect(actions).toEqual(["view"]);
    });

    it("should return view and edit for edit permission", () => {
      const actions = getAvailableActions("edit");
      expect(actions).toEqual(["view", "edit"]);
    });

    it("should return all actions for admin permission", () => {
      const actions = getAvailableActions("admin");
      expect(actions).toEqual(["view", "edit", "delete", "share"]);
    });
  });

  describe("filterMembersByRole", () => {
    const members = [
      { role: "owner" as const },
      { role: "admin" as const },
      { role: "editor" as const },
      { role: "viewer" as const },
      { role: "viewer" as const },
    ];

    it("should filter by owner role", () => {
      const filtered = filterMembersByRole(members, "owner");
      expect(filtered).toHaveLength(1);
    });

    it("should filter by viewer role", () => {
      const filtered = filterMembersByRole(members, "viewer");
      expect(filtered).toHaveLength(2);
    });

    it("should handle empty array", () => {
      const filtered = filterMembersByRole([], "admin");
      expect(filtered).toHaveLength(0);
    });
  });

  describe("countMembersByRole", () => {
    it("should count members by role", () => {
      const members = [
        { role: "owner" as const },
        { role: "admin" as const },
        { role: "editor" as const },
        { role: "viewer" as const },
        { role: "viewer" as const },
      ];

      const counts = countMembersByRole(members);
      expect(counts.owner).toBe(1);
      expect(counts.admin).toBe(1);
      expect(counts.editor).toBe(1);
      expect(counts.viewer).toBe(2);
    });

    it("should handle empty array", () => {
      const counts = countMembersByRole([]);
      expect(counts.owner).toBe(0);
      expect(counts.admin).toBe(0);
      expect(counts.editor).toBe(0);
      expect(counts.viewer).toBe(0);
    });
  });

  describe("sortCommentsByTime", () => {
    const comments = [
      { _creationTime: 100 },
      { _creationTime: 300 },
      { _creationTime: 200 },
    ];

    it("should sort descending by default", () => {
      const sorted = sortCommentsByTime(comments);
      expect(sorted[0]._creationTime).toBe(300);
      expect(sorted[1]._creationTime).toBe(200);
      expect(sorted[2]._creationTime).toBe(100);
    });

    it("should sort ascending when specified", () => {
      const sorted = sortCommentsByTime(comments, "asc");
      expect(sorted[0]._creationTime).toBe(100);
      expect(sorted[1]._creationTime).toBe(200);
      expect(sorted[2]._creationTime).toBe(300);
    });

    it("should not modify original array", () => {
      const original = [...comments];
      sortCommentsByTime(comments);
      expect(comments).toEqual(original);
    });

    it("should handle empty array", () => {
      const sorted = sortCommentsByTime([]);
      expect(sorted).toHaveLength(0);
    });
  });

  describe("groupCommentsByStatus", () => {
    const comments = [
      { resolved: true },
      { resolved: false },
      { resolved: true },
      { resolved: false },
      { resolved: false },
    ];

    it("should group by resolved status", () => {
      const grouped = groupCommentsByStatus(comments);
      expect(grouped.resolved).toHaveLength(2);
      expect(grouped.unresolved).toHaveLength(3);
    });

    it("should handle all resolved", () => {
      const allResolved = [{ resolved: true }, { resolved: true }];
      const grouped = groupCommentsByStatus(allResolved);
      expect(grouped.resolved).toHaveLength(2);
      expect(grouped.unresolved).toHaveLength(0);
    });

    it("should handle all unresolved", () => {
      const allUnresolved = [{ resolved: false }, { resolved: false }];
      const grouped = groupCommentsByStatus(allUnresolved);
      expect(grouped.resolved).toHaveLength(0);
      expect(grouped.unresolved).toHaveLength(2);
    });

    it("should handle empty array", () => {
      const grouped = groupCommentsByStatus([]);
      expect(grouped.resolved).toHaveLength(0);
      expect(grouped.unresolved).toHaveLength(0);
    });
  });

  describe("buildCommentThread", () => {
    it("should build thread structure", () => {
      const comments = [
        { _id: "1", parentCommentId: undefined },
        { _id: "2", parentCommentId: "1" },
        { _id: "3", parentCommentId: "1" },
        { _id: "4", parentCommentId: undefined },
      ];

      const threads = buildCommentThread(comments);
      expect(threads.get("root")).toHaveLength(2);
      expect(threads.get("1")).toHaveLength(2);
    });

    it("should handle no replies", () => {
      const comments = [
        { _id: "1", parentCommentId: undefined },
        { _id: "2", parentCommentId: undefined },
      ];

      const threads = buildCommentThread(comments);
      expect(threads.get("root")).toHaveLength(2);
    });

    it("should handle empty array", () => {
      const threads = buildCommentThread([]);
      expect(threads.size).toBe(0);
    });

    it("should handle nested threads", () => {
      const comments = [
        { _id: "1", parentCommentId: undefined },
        { _id: "2", parentCommentId: "1" },
        { _id: "3", parentCommentId: "2" },
      ];

      const threads = buildCommentThread(comments);
      expect(threads.get("root")).toHaveLength(1);
      expect(threads.get("1")).toHaveLength(1);
      expect(threads.get("2")).toHaveLength(1);
    });
  });

  describe("ROLE_LEVELS", () => {
    it("should have correct hierarchy", () => {
      expect(ROLE_LEVELS.owner).toBeGreaterThan(ROLE_LEVELS.admin);
      expect(ROLE_LEVELS.admin).toBeGreaterThan(ROLE_LEVELS.editor);
      expect(ROLE_LEVELS.editor).toBeGreaterThan(ROLE_LEVELS.viewer);
    });

    it("should have all roles defined", () => {
      expect(ROLE_LEVELS).toHaveProperty("owner");
      expect(ROLE_LEVELS).toHaveProperty("admin");
      expect(ROLE_LEVELS).toHaveProperty("editor");
      expect(ROLE_LEVELS).toHaveProperty("viewer");
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in workspace names", () => {
      const result = validateWorkspaceName("Team @#$%");
      expect(result.valid).toBe(true);
    });

    it("should handle unicode in comments", () => {
      const result = validateComment("Hello 👋 World! ñ á é");
      expect(result.valid).toBe(true);
    });

    it("should handle very long share IDs", () => {
      const link = generateShareLink("a".repeat(100), "b".repeat(100));
      expect(link).toContain("a".repeat(100));
    });

    it("should handle malformed URLs in parseShareLink", () => {
      const result = parseShareLink("not a url at all");
      expect(result.serverId).toBe(null);
      expect(result.shareId).toBe(null);
    });
  });
});
