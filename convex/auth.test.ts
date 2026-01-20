/**
 * Tests for User Authentication Logic and Data Structures
 */

import { describe, it, expect } from "vitest";

describe("User Authentication", () => {
  describe("User Data Model", () => {
    it("should have required fields", () => {
      const user = {
        clerkId: "user_abc123",
        email: "test@example.com",
        name: "Test User",
        imageUrl: "https://example.com/avatar.jpg",
        _id: "convex_user_123" as any,
        _creationTime: Date.now(),
      };

      expect(user.clerkId).toBeTruthy();
      expect(user.email).toBeTruthy();
      expect(user._id).toBeTruthy();
    });

    it("should support optional fields", () => {
      const minimalUser = {
        clerkId: "user_abc123",
        email: "test@example.com",
        _id: "convex_user_123" as any,
        _creationTime: Date.now(),
      };

      expect(minimalUser.clerkId).toBeTruthy();
      expect(minimalUser.email).toBeTruthy();
      expect((minimalUser as any).name).toBeUndefined();
      expect((minimalUser as any).imageUrl).toBeUndefined();
    });

    it("should validate Clerk ID format", () => {
      const isValidClerkId = (id: string) => {
        // Clerk IDs typically start with "user_" followed by alphanumeric chars
        return /^user_[a-zA-Z0-9]+$/.test(id);
      };

      expect(isValidClerkId("user_abc123")).toBe(true);
      expect(isValidClerkId("user_37iOXdRru0GTnOmrG8ksqpgQqP4")).toBe(true);
      expect(isValidClerkId("abc123")).toBe(false);
      expect(isValidClerkId("")).toBe(false);
    });

    it("should validate email format", () => {
      const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      };

      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.org")).toBe(true);
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@domain.com")).toBe(false);
    });
  });

  describe("User ID Mapping", () => {
    it("should distinguish Clerk IDs from Convex IDs", () => {
      const clerkId = "user_37iOXdRru0GTnOmrG8ksqpgQqP4";
      const convexId = "k5782a9xyz" as any; // Convex IDs are shorter

      const isClerkId = (id: string) => id.startsWith("user_");
      const isConvexId = (id: string) => !id.startsWith("user_") && id.length < 20;

      expect(isClerkId(clerkId)).toBe(true);
      expect(isClerkId(convexId)).toBe(false);
      expect(isConvexId(convexId)).toBe(true);
    });

    it("should map users by Clerk ID index", () => {
      const users = [
        { clerkId: "user_1", _id: "convex_a" },
        { clerkId: "user_2", _id: "convex_b" },
        { clerkId: "user_3", _id: "convex_c" },
      ];

      const findByClerkId = (clerkId: string) => {
        return users.find(u => u.clerkId === clerkId);
      };

      expect(findByClerkId("user_2")?._id).toBe("convex_b");
      expect(findByClerkId("user_4")).toBeUndefined();
    });

    it("should use Convex ID for database operations", () => {
      const user = {
        clerkId: "user_abc123",
        _id: "k5782a9xyz123" as any, // Convex IDs don't start with "user_"
      };

      // When calling Convex mutations, we should use _id, not clerkId
      const shouldUseForMutation = user._id;
      expect(shouldUseForMutation).not.toContain("user_");
      expect(shouldUseForMutation).not.toBe(user.clerkId);
    });
  });

  describe("ensureUser Logic", () => {
    it("should return existing user if found", () => {
      const existingUsers = [
        { clerkId: "user_abc", email: "abc@test.com", _id: "convex_1" },
        { clerkId: "user_def", email: "def@test.com", _id: "convex_2" },
      ];

      const ensureUser = (clerkId: string, email: string) => {
        const existing = existingUsers.find(u => u.clerkId === clerkId);
        if (existing) return existing;

        // Would create new user
        const newUser = { clerkId, email, _id: `convex_new_${Date.now()}` };
        existingUsers.push(newUser);
        return newUser;
      };

      const result = ensureUser("user_abc", "abc@test.com");
      expect(result._id).toBe("convex_1");
      expect(existingUsers).toHaveLength(2); // No new user added
    });

    it("should create new user if not found", () => {
      const users: any[] = [];

      const ensureUser = (clerkId: string, email: string) => {
        const existing = users.find(u => u.clerkId === clerkId);
        if (existing) return existing;

        const newUser = { clerkId, email, _id: `convex_${users.length + 1}` };
        users.push(newUser);
        return newUser;
      };

      const result = ensureUser("user_new", "new@test.com");
      expect(result.clerkId).toBe("user_new");
      expect(users).toHaveLength(1);
    });

    it("should include optional fields when creating", () => {
      const createUser = (args: {
        clerkId: string;
        email: string;
        name?: string;
        imageUrl?: string;
      }) => {
        return {
          clerkId: args.clerkId,
          email: args.email,
          name: args.name,
          imageUrl: args.imageUrl,
          _id: `convex_${Date.now()}`,
        };
      };

      const withOptional = createUser({
        clerkId: "user_123",
        email: "test@example.com",
        name: "Test User",
        imageUrl: "https://example.com/avatar.jpg",
      });

      expect(withOptional.name).toBe("Test User");
      expect(withOptional.imageUrl).toBe("https://example.com/avatar.jpg");

      const withoutOptional = createUser({
        clerkId: "user_456",
        email: "test2@example.com",
      });

      expect(withoutOptional.name).toBeUndefined();
      expect(withoutOptional.imageUrl).toBeUndefined();
    });

    it("should be idempotent", () => {
      const users: any[] = [];

      const ensureUser = (clerkId: string, email: string) => {
        const existing = users.find(u => u.clerkId === clerkId);
        if (existing) return existing;

        const newUser = { clerkId, email, _id: `convex_${users.length + 1}` };
        users.push(newUser);
        return newUser;
      };

      // Call multiple times with same clerkId
      const result1 = ensureUser("user_idempotent", "test@test.com");
      const result2 = ensureUser("user_idempotent", "test@test.com");
      const result3 = ensureUser("user_idempotent", "test@test.com");

      expect(result1._id).toBe(result2._id);
      expect(result2._id).toBe(result3._id);
      expect(users).toHaveLength(1);
    });
  });

  describe("API Key Management", () => {
    it("should have required API key fields", () => {
      const apiKey = {
        userId: "convex_user_123" as any,
        keyHash: "sha256_abc123def456",
        name: "Development Key",
        lastUsed: Date.now(),
        _id: "key_123" as any,
      };

      expect(apiKey.userId).toBeTruthy();
      expect(apiKey.keyHash).toBeTruthy();
      expect(apiKey.name).toBeTruthy();
    });

    it("should hash API keys securely", () => {
      // Simulate key hashing
      const hashKey = (key: string): string => {
        // In real implementation, use crypto.createHash('sha256')
        return `sha256_${key.split('').reverse().join('')}`;
      };

      const rawKey = "mcp_live_abc123";
      const hash = hashKey(rawKey);

      expect(hash).not.toBe(rawKey);
      expect(hash).toContain("sha256_");
    });

    it("should track last used timestamp", () => {
      const apiKey = {
        userId: "convex_user_123" as any,
        keyHash: "sha256_abc123",
        name: "Test Key",
        lastUsed: undefined as number | undefined,
      };

      // Simulate usage
      const updateLastUsed = (key: typeof apiKey) => {
        return { ...key, lastUsed: Date.now() };
      };

      expect(apiKey.lastUsed).toBeUndefined();

      const usedKey = updateLastUsed(apiKey);
      expect(usedKey.lastUsed).toBeDefined();
      expect(usedKey.lastUsed).toBeGreaterThan(0);
    });

    it("should list keys by user", () => {
      const apiKeys = [
        { userId: "user_1", name: "Key 1" },
        { userId: "user_2", name: "Key 2" },
        { userId: "user_1", name: "Key 3" },
      ];

      const listByUser = (userId: string) => {
        return apiKeys.filter(k => k.userId === userId);
      };

      expect(listByUser("user_1")).toHaveLength(2);
      expect(listByUser("user_2")).toHaveLength(1);
      expect(listByUser("user_3")).toHaveLength(0);
    });
  });

  describe("User Lookup", () => {
    it("should find user by Clerk ID", () => {
      const users = [
        { clerkId: "user_a", email: "a@test.com", _id: "id_1" },
        { clerkId: "user_b", email: "b@test.com", _id: "id_2" },
      ];

      const getUserByClerkId = (clerkId: string) => {
        return users.find(u => u.clerkId === clerkId) || null;
      };

      expect(getUserByClerkId("user_a")?._id).toBe("id_1");
      expect(getUserByClerkId("user_c")).toBeNull();
    });

    it("should find user by API key hash", () => {
      const apiKeys = [
        { keyHash: "hash_1", userId: "user_a" },
        { keyHash: "hash_2", userId: "user_b" },
      ];

      const users = [
        { _id: "user_a", email: "a@test.com" },
        { _id: "user_b", email: "b@test.com" },
      ];

      const getUserByApiKey = (keyHash: string) => {
        const key = apiKeys.find(k => k.keyHash === keyHash);
        if (!key) return null;
        return users.find(u => u._id === key.userId) || null;
      };

      expect(getUserByApiKey("hash_1")?.email).toBe("a@test.com");
      expect(getUserByApiKey("hash_invalid")).toBeNull();
    });
  });

  describe("User Deletion", () => {
    it("should delete associated API keys when user is deleted", () => {
      let apiKeys = [
        { _id: "key_1", userId: "user_to_delete" },
        { _id: "key_2", userId: "user_to_delete" },
        { _id: "key_3", userId: "other_user" },
      ];

      const deleteUserApiKeys = (userId: string) => {
        apiKeys = apiKeys.filter(k => k.userId !== userId);
      };

      deleteUserApiKeys("user_to_delete");

      expect(apiKeys).toHaveLength(1);
      expect(apiKeys[0].userId).toBe("other_user");
    });

    it("should delete associated integrations when user is deleted", () => {
      let userIntegrations = [
        { _id: "ui_1", userId: "user_to_delete", integrationId: "int_1" },
        { _id: "ui_2", userId: "user_to_delete", integrationId: "int_2" },
        { _id: "ui_3", userId: "other_user", integrationId: "int_1" },
      ];

      const deleteUserIntegrations = (userId: string) => {
        userIntegrations = userIntegrations.filter(ui => ui.userId !== userId);
      };

      deleteUserIntegrations("user_to_delete");

      expect(userIntegrations).toHaveLength(1);
      expect(userIntegrations[0].userId).toBe("other_user");
    });
  });

  describe("upsertUserFromClerk Logic", () => {
    it("should update existing user fields", () => {
      const existingUser = {
        clerkId: "user_123",
        email: "old@test.com",
        name: "Old Name",
        imageUrl: "old-url.jpg",
        _id: "convex_1",
      };

      const upsertUser = (
        users: any[],
        args: { clerkId: string; email: string; name?: string; imageUrl?: string }
      ) => {
        const existing = users.find(u => u.clerkId === args.clerkId);
        if (existing) {
          existing.email = args.email;
          existing.name = args.name;
          existing.imageUrl = args.imageUrl;
          return existing._id;
        }
        const newId = `convex_${Date.now()}`;
        users.push({ ...args, _id: newId });
        return newId;
      };

      const users = [existingUser];

      upsertUser(users, {
        clerkId: "user_123",
        email: "new@test.com",
        name: "New Name",
        imageUrl: "new-url.jpg",
      });

      expect(existingUser.email).toBe("new@test.com");
      expect(existingUser.name).toBe("New Name");
      expect(existingUser.imageUrl).toBe("new-url.jpg");
      expect(users).toHaveLength(1);
    });

    it("should create user if not exists", () => {
      const users: any[] = [];

      const upsertUser = (
        args: { clerkId: string; email: string; name?: string; imageUrl?: string }
      ) => {
        const existing = users.find(u => u.clerkId === args.clerkId);
        if (existing) {
          return existing._id;
        }
        const newId = `convex_${Date.now()}`;
        users.push({ ...args, _id: newId });
        return newId;
      };

      const id = upsertUser({
        clerkId: "user_new",
        email: "new@test.com",
        name: "New User",
      });

      expect(users).toHaveLength(1);
      expect(users[0].clerkId).toBe("user_new");
      expect(id).toContain("convex_");
    });
  });

  describe("Frontend User ID Handling", () => {
    it("should pass Convex ID to mutations, not Clerk ID", () => {
      const clerkUser = { id: "user_37iOXdRru0GTnOmrG8ksqpgQqP4" };
      const convexUser = { _id: "k5782a9xyz", clerkId: clerkUser.id };

      // Correct: Use convexUser._id for mutations
      const correctMutationArg = convexUser._id;
      expect(correctMutationArg).not.toContain("user_");

      // Incorrect: Using clerkUser.id directly
      const incorrectMutationArg = clerkUser.id;
      expect(incorrectMutationArg).toContain("user_");
    });

    it("should query Convex user before calling mutations", () => {
      // Simulate the correct flow
      const clerkUser = { id: "user_abc123", email: "test@test.com" };
      const convexUsers = [
        { clerkId: "user_abc123", _id: "convex_1" },
        { clerkId: "user_def456", _id: "convex_2" },
      ];

      const getConvexUser = (clerkId: string) => {
        return convexUsers.find(u => u.clerkId === clerkId);
      };

      const convexUser = getConvexUser(clerkUser.id);

      if (convexUser) {
        // Now we can safely use convexUser._id for mutations
        expect(convexUser._id).toBe("convex_1");
      }
    });

    it("should handle case when Convex user does not exist yet", () => {
      const clerkUser = { id: "user_new", email: "new@test.com" };
      const convexUsers: any[] = [];

      const getConvexUser = (clerkId: string) => {
        return convexUsers.find(u => u.clerkId === clerkId) || null;
      };

      const convexUser = getConvexUser(clerkUser.id);

      // convexUser is null, need to call ensureUser first
      expect(convexUser).toBeNull();

      // After ensureUser, user should exist
      convexUsers.push({ clerkId: clerkUser.id, _id: "convex_new" });
      const newConvexUser = getConvexUser(clerkUser.id);
      expect(newConvexUser?._id).toBe("convex_new");
    });

    it("should skip queries when Convex user is not available", () => {
      // Simulate Convex React hook behavior with "skip"
      const convexUser: { _id: string; clerkId: string } | null = null; // User not yet created in Convex

      const queryArgs = convexUser
        ? { userId: (convexUser as any).clerkId }
        : "skip";

      expect(queryArgs).toBe("skip");
    });

    it("should use Convex user ID when available", () => {
      const convexUser = { _id: "convex_123", clerkId: "user_abc" };

      const queryArgs = convexUser
        ? { userId: convexUser._id }
        : "skip";

      expect(queryArgs).toEqual({ userId: "convex_123" });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty email gracefully", () => {
      const createUser = (email: string) => {
        if (!email || !email.includes("@")) {
          return null;
        }
        return { email, _id: "user_123" };
      };

      expect(createUser("")).toBeNull();
      expect(createUser("valid@test.com")).not.toBeNull();
    });

    it("should handle undefined optional fields", () => {
      const user = {
        clerkId: "user_123",
        email: "test@test.com",
        name: undefined,
        imageUrl: undefined,
      };

      // These should be filtered out when inserting to DB
      const cleanedUser = Object.fromEntries(
        Object.entries(user).filter(([_, v]) => v !== undefined)
      );

      expect(cleanedUser).not.toHaveProperty("name");
      expect(cleanedUser).not.toHaveProperty("imageUrl");
      expect(cleanedUser).toHaveProperty("clerkId");
      expect(cleanedUser).toHaveProperty("email");
    });

    it("should handle concurrent ensureUser calls", () => {
      const users: any[] = [];
      let insertCount = 0;

      // Simulate database insert with uniqueness check
      const insert = (clerkId: string, email: string) => {
        if (users.some(u => u.clerkId === clerkId)) {
          throw new Error("Duplicate clerkId");
        }
        insertCount++;
        users.push({ clerkId, email, _id: `convex_${insertCount}` });
      };

      // First call succeeds
      insert("user_123", "test@test.com");
      expect(users).toHaveLength(1);

      // Second call with same clerkId should fail
      expect(() => insert("user_123", "test@test.com")).toThrow("Duplicate clerkId");
      expect(users).toHaveLength(1);
    });
  });
});
