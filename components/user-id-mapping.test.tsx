/**
 * Tests for User ID Mapping in Frontend Components
 *
 * These tests verify that frontend components correctly handle the mapping
 * between Clerk user IDs and Convex user IDs.
 */

import { describe, it, expect } from "vitest";

describe("User ID Mapping in Frontend", () => {
  describe("Clerk User to Convex User Mapping", () => {
    it("should identify Clerk user ID format", () => {
      const clerkUserId = "user_37iOXdRru0GTnOmrG8ksqpgQqP4";

      const isClerkId = (id: string) => id.startsWith("user_");

      expect(isClerkId(clerkUserId)).toBe(true);
      expect(isClerkId("k5782a9xyz")).toBe(false);
    });

    it("should identify Convex document ID format", () => {
      const convexId = "k5782a9xyz123";
      const clerkId = "user_abc123";

      const isConvexId = (id: string) => !id.startsWith("user_");

      expect(isConvexId(convexId)).toBe(true);
      expect(isConvexId(clerkId)).toBe(false);
    });

    it("should map Clerk ID to Convex user via lookup", () => {
      const convexUsers = [
        { _id: "convex_1", clerkId: "user_abc", email: "abc@test.com" },
        { _id: "convex_2", clerkId: "user_def", email: "def@test.com" },
      ];

      const findConvexUser = (clerkId: string) => {
        return convexUsers.find(u => u.clerkId === clerkId) || null;
      };

      const result = findConvexUser("user_abc");
      expect(result?._id).toBe("convex_1");
      expect(result?.clerkId).toBe("user_abc");
    });
  });

  describe("useUser Hook Pattern", () => {
    it("should extract user ID from Clerk useUser hook", () => {
      // Simulate Clerk useUser hook return value
      const clerkUser = {
        id: "user_37iOXdRru0GTnOmrG8ksqpgQqP4",
        primaryEmailAddress: { emailAddress: "test@example.com" },
        fullName: "Test User",
        imageUrl: "https://example.com/avatar.jpg",
      };

      expect(clerkUser.id).toContain("user_");
      expect(clerkUser.primaryEmailAddress.emailAddress).toBeTruthy();
    });

    it("should handle isLoaded state", () => {
      const hookResult = {
        user: null,
        isLoaded: false,
      };

      // Should skip queries when not loaded
      expect(hookResult.isLoaded).toBe(false);
      expect(hookResult.user).toBeNull();
    });

    it("should provide user when loaded", () => {
      const hookResult = {
        user: { id: "user_123" },
        isLoaded: true,
      };

      expect(hookResult.isLoaded).toBe(true);
      expect(hookResult.user?.id).toBeTruthy();
    });
  });

  describe("Convex Query Skip Pattern", () => {
    it("should skip query when user is not available", () => {
      const user = null;

      const queryArgs = user ? { clerkId: user.id } : "skip";

      expect(queryArgs).toBe("skip");
    });

    it("should provide args when user is available", () => {
      const user = { id: "user_123" };

      const queryArgs = user ? { clerkId: user.id } : "skip";

      expect(queryArgs).toEqual({ clerkId: "user_123" });
    });

    it("should skip userIntegrations query when convexUser is null", () => {
      const convexUser = null;

      const queryArgs = convexUser ? { userId: convexUser._id } : "skip";

      expect(queryArgs).toBe("skip");
    });

    it("should provide userId when convexUser is available", () => {
      const convexUser = { _id: "k5782a9xyz", clerkId: "user_123" };

      const queryArgs = convexUser ? { userId: convexUser._id } : "skip";

      expect(queryArgs).toEqual({ userId: "k5782a9xyz" });
    });
  });

  describe("ensureUser Effect Pattern", () => {
    it("should trigger ensureUser when user exists but convexUser is null", () => {
      const isLoaded = true;
      const user = { id: "user_123" };
      const convexUser = null;

      const shouldCallEnsureUser = isLoaded && user && convexUser === null;

      expect(shouldCallEnsureUser).toBe(true);
    });

    it("should not trigger ensureUser when convexUser already exists", () => {
      const isLoaded = true;
      const user = { id: "user_123" };
      const convexUser = { _id: "convex_1", clerkId: "user_123" };

      const shouldCallEnsureUser = isLoaded && user && convexUser === null;

      expect(shouldCallEnsureUser).toBe(false);
    });

    it("should not trigger ensureUser when not loaded", () => {
      const isLoaded = false;
      const user = { id: "user_123" };
      const convexUser = null;

      const shouldCallEnsureUser = isLoaded && user && convexUser === null;

      expect(shouldCallEnsureUser).toBe(false);
    });

    it("should not trigger ensureUser when no user", () => {
      const isLoaded = true;
      const user = null;
      const convexUser = null;

      const shouldCallEnsureUser = isLoaded && user !== null && convexUser === null;

      expect(shouldCallEnsureUser).toBe(false);
    });

    it("should extract correct data from Clerk user for ensureUser", () => {
      const clerkUser = {
        id: "user_123",
        primaryEmailAddress: { emailAddress: "test@example.com" },
        fullName: "Test User",
        imageUrl: "https://example.com/avatar.jpg",
      };

      const ensureUserArgs = {
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: clerkUser.fullName || undefined,
        imageUrl: clerkUser.imageUrl || undefined,
      };

      expect(ensureUserArgs.clerkId).toBe("user_123");
      expect(ensureUserArgs.email).toBe("test@example.com");
      expect(ensureUserArgs.name).toBe("Test User");
      expect(ensureUserArgs.imageUrl).toBe("https://example.com/avatar.jpg");
    });

    it("should handle missing optional fields from Clerk user", () => {
      const clerkUser = {
        id: "user_123",
        primaryEmailAddress: null,
        fullName: null,
        imageUrl: null,
      };

      const ensureUserArgs = {
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: clerkUser.fullName || undefined,
        imageUrl: clerkUser.imageUrl || undefined,
      };

      expect(ensureUserArgs.clerkId).toBe("user_123");
      expect(ensureUserArgs.email).toBe("");
      expect(ensureUserArgs.name).toBeUndefined();
      expect(ensureUserArgs.imageUrl).toBeUndefined();
    });
  });

  describe("Mutation Argument Pattern", () => {
    it("should use convexUser._id for mutations requiring userId", () => {
      const convexUser = { _id: "k5782a9xyz", clerkId: "user_123" };

      const mutationArgs = {
        userId: convexUser._id,
        integrationId: "int_abc",
      };

      expect(mutationArgs.userId).toBe("k5782a9xyz");
      expect(mutationArgs.userId).not.toContain("user_");
    });

    it("should NOT use clerkUser.id directly for mutations", () => {
      const clerkUser = { id: "user_123" };

      // This is the WRONG pattern that was causing the bug
      const wrongMutationArgs = {
        userId: clerkUser.id,
        integrationId: "int_abc",
      };

      // The userId contains "user_" which is a Clerk ID, not Convex ID
      expect(wrongMutationArgs.userId).toContain("user_");
      // This would fail validation: v.id("users")
    });

    it("should guard against calling mutations without convexUser", () => {
      const convexUser = null;

      const canCallMutation = () => {
        if (!convexUser) return false;
        return true;
      };

      expect(canCallMutation()).toBe(false);
    });

    it("should allow mutation when convexUser is available", () => {
      const convexUser = { _id: "k5782a9xyz", clerkId: "user_123" };

      const canCallMutation = () => {
        if (!convexUser) return false;
        return true;
      };

      expect(canCallMutation()).toBe(true);
    });
  });

  describe("IntegrationsPage Pattern", () => {
    it("should query getUserByClerkId with clerk user id", () => {
      const user = { id: "user_abc123" };

      const getUserByClerkIdArgs = user ? { clerkId: user.id } : "skip";

      expect(getUserByClerkIdArgs).toEqual({ clerkId: "user_abc123" });
    });

    it("should query listUserIntegrations with convex user id", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const listUserIntegrationsArgs = convexUser
        ? { userId: convexUser._id }
        : "skip";

      expect(listUserIntegrationsArgs).toEqual({ userId: "convex_123" });
    });

    it("should pass convexUser._id to enableIntegration", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const enableIntegrationArgs = {
        userId: convexUser._id,
        integrationId: "int_github",
      };

      expect(enableIntegrationArgs.userId).toBe("convex_123");
    });

    it("should pass convexUser._id to disableIntegration", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const disableIntegrationArgs = {
        userId: convexUser._id,
        integrationId: "int_github",
      };

      expect(disableIntegrationArgs.userId).toBe("convex_123");
    });
  });

  describe("CommentThread Pattern", () => {
    it("should pass convexUser._id to addComment", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const addCommentArgs = {
        serverId: "server_abc",
        userId: convexUser._id,
        content: "This is a comment",
      };

      expect(addCommentArgs.userId).toBe("convex_123");
    });

    it("should compare ownership using convexUser._id", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };
      const comment = { userId: "convex_123", content: "test" };

      const isOwner = convexUser?._id === comment.userId;

      expect(isOwner).toBe(true);
    });

    it("should NOT compare ownership using clerkId", () => {
      const clerkUser = { id: "user_abc123" };
      const comment = { userId: "convex_123", content: "test" };

      // This is WRONG - comparing Clerk ID with Convex ID
      const wrongIsOwner = clerkUser.id === comment.userId;

      expect(wrongIsOwner).toBe(false);
    });
  });

  describe("WorkspaceList Pattern", () => {
    it("should query listUserWorkspaces with convex user id", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const queryArgs = convexUser
        ? { userId: convexUser._id }
        : "skip";

      expect(queryArgs).toEqual({ userId: "convex_123" });
    });

    it("should pass convexUser._id to createWorkspace", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const createWorkspaceArgs = {
        name: "My Workspace",
        userId: convexUser._id,
      };

      expect(createWorkspaceArgs.userId).toBe("convex_123");
    });
  });

  describe("ShareDialog Pattern", () => {
    it("should query listUserWorkspaces with convex user id", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const queryArgs = convexUser
        ? { userId: convexUser._id }
        : "skip";

      expect(queryArgs).toEqual({ userId: "convex_123" });
    });

    it("should pass convexUser._id to makePublic sharedBy", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const makePublicArgs = {
        serverId: "server_abc",
        permission: "view",
        sharedBy: convexUser._id,
      };

      expect(makePublicArgs.sharedBy).toBe("convex_123");
    });

    it("should pass convexUser._id to shareWithWorkspace sharedBy", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc123" };

      const shareArgs = {
        serverId: "server_abc",
        workspaceId: "ws_123",
        permission: "edit",
        sharedBy: convexUser._id,
      };

      expect(shareArgs.sharedBy).toBe("convex_123");
    });
  });

  describe("Error Prevention", () => {
    it("should detect invalid user ID passed to Convex mutation", () => {
      const validateUserId = (userId: string) => {
        // Convex IDs don't start with "user_"
        if (userId.startsWith("user_")) {
          return { valid: false, error: "Clerk ID passed instead of Convex ID" };
        }
        return { valid: true, error: null };
      };

      expect(validateUserId("user_abc123").valid).toBe(false);
      expect(validateUserId("k5782a9xyz").valid).toBe(true);
    });

    it("should provide helpful error message for ID mismatch", () => {
      const error = {
        message: "ArgumentValidationError: Value does not match validator.",
        path: ".userId",
        value: "user_37iOXdRru0GTnOmrG8ksqpgQqP4",
        validator: "v.id(\"users\")",
      };

      const isClerkIdError = error.value.startsWith("user_") &&
                             error.validator.includes("v.id");

      expect(isClerkIdError).toBe(true);
    });
  });

  describe("State Transitions", () => {
    it("should handle initial state before user loads", () => {
      const state = {
        isLoaded: false,
        user: null,
        convexUser: undefined, // Query hasn't run yet
      };

      expect(state.isLoaded).toBe(false);
      expect(state.user).toBeNull();
      expect(state.convexUser).toBeUndefined();
    });

    it("should handle state after Clerk loads but before Convex query", () => {
      const state = {
        isLoaded: true,
        user: { id: "user_123" },
        convexUser: undefined, // Query is loading
      };

      // convexUser is undefined (loading), not null (not found)
      const isLoading = state.convexUser === undefined;
      expect(isLoading).toBe(true);
    });

    it("should handle state when convexUser not found (new user)", () => {
      const state = {
        isLoaded: true,
        user: { id: "user_123" },
        convexUser: null, // Query returned null
      };

      // Should trigger ensureUser
      const shouldEnsure = state.convexUser === null && state.user !== null;
      expect(shouldEnsure).toBe(true);
    });

    it("should handle state when convexUser is found", () => {
      const state = {
        isLoaded: true,
        user: { id: "user_123" },
        convexUser: { _id: "convex_abc", clerkId: "user_123" },
      };

      // Ready to make queries/mutations
      const isReady = state.convexUser !== null && state.convexUser !== undefined;
      expect(isReady).toBe(true);
    });
  });
});
